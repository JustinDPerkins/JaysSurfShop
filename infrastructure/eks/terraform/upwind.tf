# Upwind EKS Marketplace add-on (optional)
resource "aws_eks_addon" "upwind" {
  count = var.upwind_client_id != "" ? 1 : 0

  cluster_name = aws_eks_cluster.main.name
  addon_name   = "upwind-security_upwind-operator"

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
}
