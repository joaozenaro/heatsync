.PHONY: default dev 

default: help

dev:
	tmux new-session -d -s dev 'cd backend && npm run start:dev'
	tmux split-window -h -t dev 'cd frontend && PORT=3001 npm run dev'
	tmux attach -t dev

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