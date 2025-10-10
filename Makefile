.PHONY: default dev 

default: help

dev:
	zellij -l dev.kdl

install:
	@echo "Installing backend and frontend dependencies..."
	@(cd backend && npm install)
	@(cd frontend && npm install)

i:
	@$(MAKE) install

help:
	@echo "Makefile Helper."
	@echo ""
	@echo "Usage: make [target]..."
	@echo ""
	@echo "Targets:"
	@echo "    dev        Start development servers"