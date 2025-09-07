#!/bin/zsh

# Jiceot Docker Build and Push Script
# This script builds the Docker image, increments the minor version, tags it, and pushes to Docker Hub

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REPO="dannyswat/jiceot"
VERSION_FILE="dockerversion"
DOCKERFILE="Dockerfile"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose not found, but continuing..."
    fi
    
    print_success "Prerequisites check passed"
}

# Function to check if Docker daemon is running
check_docker_daemon() {
    print_status "Checking Docker daemon..."
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker Desktop or Docker daemon."
        exit 1
    fi
    
    print_success "Docker daemon is running"
}

# Function to read current version
get_current_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        CURRENT_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
        print_status "Current version: $CURRENT_VERSION"
    else
        print_warning "Version file not found. Creating with initial version v0.1.0"
        CURRENT_VERSION="v0.1.0"
        echo "$CURRENT_VERSION" > "$VERSION_FILE"
    fi
}

# Function to increment minor version
increment_minor_version() {
    print_status "Incrementing minor version..."
    
    # Remove 'v' prefix if present
    VERSION_NUM=${CURRENT_VERSION#v}
    
    # Split version into parts
    IFS='.' read -r major minor patch <<< "$VERSION_NUM"
    
    # Increment minor version, reset patch to 0
    NEW_MINOR=$((minor + 1))
    NEW_VERSION="v${major}.${NEW_MINOR}.0"
    
    print_success "New version: $NEW_VERSION"
}

# Function to update version file
update_version_file() {
    print_status "Updating version file..."
    echo "$NEW_VERSION" > "$VERSION_FILE"
    print_success "Version file updated to $NEW_VERSION"
}

# Function to build Docker image
build_docker_image() {
    print_status "Building Docker image..."
    # Build with multiple tags
    docker build --platform linux/arm64,linux/amd64 \
                 -t "${DOCKER_REPO}:${NEW_VERSION}" \
                 -t "${DOCKER_REPO}:latest" \
                 -f "$DOCKERFILE" .
    
    if [[ $? -eq 0 ]]; then
        print_success "Docker image built successfully"
    else
        print_error "Docker build failed"
        exit 1
    fi
}

# Function to push images to Docker Hub
push_images() {
    print_status "Pushing images to Docker Hub..."
    
    # Push versioned tag
    print_status "Pushing ${DOCKER_REPO}:${NEW_VERSION}..."
    docker push "${DOCKER_REPO}:${NEW_VERSION}"
    
    if [[ $? -eq 0 ]]; then
        print_success "Versioned image pushed successfully"
    else
        print_error "Failed to push versioned image"
        exit 1
    fi
    
    # Push latest tag
    print_status "Pushing ${DOCKER_REPO}:latest..."
    docker push "${DOCKER_REPO}:latest"
    
    if [[ $? -eq 0 ]]; then
        print_success "Latest image pushed successfully"
    else
        print_error "Failed to push latest image"
        exit 1
    fi
}

# Function to clean up old images (optional)
cleanup_images() {
    print_status "Cleaning up old images..."
    
    # Remove dangling images
    DANGLING_IMAGES=$(docker images -f "dangling=true" -q)
    if [[ -n "$DANGLING_IMAGES" ]]; then
        docker rmi $DANGLING_IMAGES
        print_success "Removed dangling images"
    else
        print_status "No dangling images to remove"
    fi
}

# Function to display image information
display_image_info() {
    print_status "Image information:"
    echo "Repository: $DOCKER_REPO"
    echo "Version: $NEW_VERSION"
    echo "Tags: $NEW_VERSION, latest"
    
    # Show image size
    IMAGE_SIZE=$(docker images "${DOCKER_REPO}:${NEW_VERSION}" --format "table {{.Size}}" | tail -n 1)
    echo "Image size: $IMAGE_SIZE"
    
    print_success "Build and push completed successfully!"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help       Show this help message"
    echo "  --no-push        Build image but don't push to Docker Hub"
    echo "  --no-cleanup     Skip cleanup of dangling images"
    echo "  --keep-version   Use current version without incrementing"
    echo "  --dry-run        Show what would be done without actually doing it"
    echo ""
    echo "Environment Variables:"
    echo "  DOCKER_REPO    Docker repository (default: dannys/jiceot)"
    echo ""
    echo "Example:"
    echo "  $0                    # Build, version, and push"
    echo "  $0 --no-push         # Build and version only"
    echo "  $0 --keep-version    # Build with current version"
    echo "  $0 --dry-run         # Show what would be done"
}

# Parse command line arguments
NO_PUSH=false
NO_CLEANUP=false
DRY_RUN=false
KEEP_VERSION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        --no-push)
            NO_PUSH=true
            shift
            ;;
        --no-cleanup)
            NO_CLEANUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --keep-version)
            KEEP_VERSION=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Override DOCKER_REPO if environment variable is set
if [[ -n "${DOCKER_REPO_ENV}" ]]; then
    DOCKER_REPO="$DOCKER_REPO_ENV"
fi

# Main execution
main() {
    echo "======================================="
    echo "  Jiceot Docker Build & Push Script"
    echo "======================================="
    echo ""
    
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No actual changes will be made"
        echo ""
    fi
    
    # Pre-flight checks
    check_prerequisites
    check_docker_daemon
    
    # Version management
    get_current_version
    if [[ "$KEEP_VERSION" == false ]]; then
        increment_minor_version
    else
        NEW_VERSION="$CURRENT_VERSION"
        print_status "Keeping current version: $NEW_VERSION"
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "Would update version from $CURRENT_VERSION to $NEW_VERSION"
        print_status "Would build image: ${DOCKER_REPO}:${NEW_VERSION}"
        print_status "Would build image: ${DOCKER_REPO}:latest"
        
        if [[ "$NO_PUSH" == false ]]; then
            print_status "Would push images to Docker Hub"
        fi
        
        print_status "DRY RUN completed"
        return 0
    fi
    
    # Update version
    if [[ "$KEEP_VERSION" == false ]]; then
        update_version_file
    else
        print_status "Version file unchanged (--keep-version specified)"
    fi
    
    # Build image
    build_docker_image
    
    # Push to Docker Hub (unless --no-push is specified)
    if [[ "$NO_PUSH" == false ]]; then
        push_images
    else
        print_warning "Skipping push to Docker Hub (--no-push specified)"
    fi
    
    # Cleanup (unless --no-cleanup is specified)
    if [[ "$NO_CLEANUP" == false ]]; then
        cleanup_images
    else
        print_status "Skipping cleanup (--no-cleanup specified)"
    fi
    
    # Display final information
    display_image_info
    
    echo ""
    echo "======================================="
    print_success "Script completed successfully!"
    echo "======================================="
}

# Run main function
main "$@"