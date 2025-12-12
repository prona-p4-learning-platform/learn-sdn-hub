terraform {
  required_providers {
    helm = {
      source = "hashicorp/helm"
      version = "3.1.0"
    }

    kubernetes = {
      source = "hashicorp/kubernetes"
      version = "2.38.0"
    }

    local = {
      source = "hashicorp/local"
      version = "2.6.1"
    }
  }
}

provider "helm" {
  kubernetes = {
    config_path = "~/.kube/config"
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}