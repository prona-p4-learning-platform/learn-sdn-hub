resource "helm_release" "nginx-ingress-controller" {
  name = "nginx-ingress-controller"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart = "ingress-nginx"
  version = "4.14.0"
  namespace = "nginx-controller"
  create_namespace = true
  values = [file("${path.module}/helm/nginx-ingress-values.yaml")]
}