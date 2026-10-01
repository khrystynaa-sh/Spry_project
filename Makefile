# Spry deploy contract.
#
# Local use and CI use the SAME targets: CI has no private recipe of its own.
# Needs: AWS CLI v2 with credentials (aws configure locally, an OIDC role in CI),
# Docker, Node 20, Python 3.12. On Windows run make from Git Bash.
#
# Configuration comes from the environment or the command line, never from a
# file in git. Example:
#   make deploy-frontend S3_BUCKET=my-bucket CLOUDFRONT_DISTRIBUTION_ID=E123ABC \
#        API_URL=https://api.example.com

AWS_REGION                 ?= eu-central-1
S3_BUCKET                  ?=
CLOUDFRONT_DISTRIBUTION_ID ?=
API_URL                    ?=
ECR_REPOSITORY             ?= spry-backend
ECS_CLUSTER                ?= spry
ECS_SERVICE                ?= spry-backend
ECS_TASK_FAMILY            ?= spry-backend
DATABASE_URL_SECRET_ARN    ?=
CORS_ORIGINS               ?=

# "?=" and "=" are evaluated lazily, so `make help` never calls AWS.
AWS_ACCOUNT_ID ?= $(shell aws sts get-caller-identity --query Account --output text)
GIT_SHA        := $(shell git rev-parse --short=12 HEAD)
IMAGE_TAG      ?= $(GIT_SHA)
ECR_REGISTRY    = $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
IMAGE           = $(ECR_REGISTRY)/$(ECR_REPOSITORY):$(IMAGE_TAG)

# Read by `vite build`: the backend address baked into the production bundle.
export VITE_API_URL := $(API_URL)

.DEFAULT_GOAL := help
.PHONY: help lint test deploy-frontend deploy-backend

help:
	@echo "make lint             ruff, ESLint and Prettier checks (what CI runs)"
	@echo "make test             backend tests"
	@echo "make deploy-frontend  build the bundle, sync to S3, invalidate CloudFront"
	@echo "make deploy-backend   build the image, push to ECR, roll the ECS service"
	@echo "Settings are read from the environment or passed as VAR=value (see top of Makefile)."

lint:
	cd backend && python -m ruff check . && python -m ruff format --check .
	cd frontend && npm run lint && npm run format:check

test:
	cd backend && python -m pytest

deploy-frontend: require-S3_BUCKET require-CLOUDFRONT_DISTRIBUTION_ID require-API_URL
	cd frontend && npm ci && npm run build
	aws s3 sync frontend/dist s3://$(S3_BUCKET) --delete --region $(AWS_REGION)
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DISTRIBUTION_ID) --paths "/*"

deploy-backend: require-DATABASE_URL_SECRET_ARN require-CORS_ORIGINS
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REGISTRY)
	docker build -t $(IMAGE) backend
	docker push $(IMAGE)
	sed -e "s|__IMAGE__|$(IMAGE)|" -e "s|__AWS_ACCOUNT_ID__|$(AWS_ACCOUNT_ID)|g" -e "s|__AWS_REGION__|$(AWS_REGION)|g" -e "s|__DATABASE_URL_SECRET_ARN__|$(DATABASE_URL_SECRET_ARN)|" -e "s|__CORS_ORIGINS__|$(CORS_ORIGINS)|" infra/ecs-task-definition.json > task-definition.rendered.json
	aws ecs register-task-definition --region $(AWS_REGION) --cli-input-json file://task-definition.rendered.json > /dev/null
	aws ecs update-service --region $(AWS_REGION) --cluster $(ECS_CLUSTER) --service $(ECS_SERVICE) --task-definition $(ECS_TASK_FAMILY) > /dev/null
	aws ecs wait services-stable --region $(AWS_REGION) --cluster $(ECS_CLUSTER) --services $(ECS_SERVICE)
	@echo "Deployed $(IMAGE)"

# Fails early, with a readable message, when a required setting is missing.
require-%:
	@test -n "$($*)" || { echo "Missing $*: set it in the environment or pass $*=... to make"; exit 1; }
