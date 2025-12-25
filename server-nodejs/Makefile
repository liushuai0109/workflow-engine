.PHONY: help install build dev start test lint clean

help:
	@echo "Workflow Engine Server - Node.js + TypeScript + Koa"
	@echo ""
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make build      - Build TypeScript to JavaScript"
	@echo "  make dev        - Start development server with hot reload"
	@echo "  make start      - Start production server"
	@echo "  make test       - Run tests"
	@echo "  make test-watch - Run tests in watch mode"
	@echo "  make coverage   - Run tests with coverage"
	@echo "  make lint       - Run ESLint"
	@echo "  make lint-fix   - Run ESLint and auto-fix"
	@echo "  make format     - Run Prettier"
	@echo "  make clean      - Clean build artifacts"

install:
	@echo "📦 Installing dependencies..."
	npm install

build:
	@echo "🔨 Building TypeScript..."
	npm run build

dev:
	@echo "🚀 Starting development server..."
	npm run dev

start:
	@echo "▶️  Starting production server..."
	npm start

test:
	@echo "🧪 Running tests..."
	npm test

test-watch:
	@echo "🧪 Running tests in watch mode..."
	npm run test:watch

coverage:
	@echo "📊 Running tests with coverage..."
	npm run test:coverage

lint:
	@echo "🔍 Running ESLint..."
	npm run lint

lint-fix:
	@echo "🔧 Running ESLint with auto-fix..."
	npm run lint:fix

format:
	@echo "✨ Running Prettier..."
	npm run format

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist
	rm -rf node_modules
	rm -rf coverage
