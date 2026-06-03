resource "kubernetes_service_account_v1" "sa-local-dev" {
  metadata {
    name = "sa-local-dev"
    namespace = "default"
  }
}

resource "kubernetes_cluster_role_binding_v1" "binding-sa-local-dev-cluster-admin" {
  metadata {
    name = "binding-sa-local-dev-cluster-admin"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind = "ClusterRole"
    name = "cluster-admin"
  }
  subject {
    kind = "ServiceAccount"
    name = kubernetes_service_account_v1.sa-local-dev.metadata[0].name
    namespace = kubernetes_service_account_v1.sa-local-dev.metadata[0].namespace
  }
}

resource "kubernetes_secret_v1" "local-dev-token" {
  metadata {
    name = "local-dev-token"
    annotations = {
      "kubernetes.io/service-account.name": kubernetes_service_account_v1.sa-local-dev.metadata[0].name
    }
  }
  type = "kubernetes.io/service-account-token"
  depends_on = [ kubernetes_service_account_v1.sa-local-dev, kubernetes_cluster_role_binding_v1.binding-sa-local-dev-cluster-admin ]
}

resource "local_file" "local-dev-token" {
  filename = "../cluster-config/token"
  content = kubernetes_secret_v1.local-dev-token.data["token"]
  depends_on = [ kubernetes_secret_v1.local-dev-token ]
}

resource "local_file" "local-dev-ca" {
  filename = "../cluster-config/ca.crt"
  content = kubernetes_secret_v1.local-dev-token.data["ca.crt"]
  depends_on = [ kubernetes_secret_v1.local-dev-token ]
}
