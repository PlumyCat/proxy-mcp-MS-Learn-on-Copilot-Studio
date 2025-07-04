# MCP Proxy Azure Deployment Guide

To deploy your MCP proxy on Azure in a **cost-effective** way, here are the best options:

## 🏆 **Option 1: Azure Container Apps (RECOMMENDED)**

**Why it's the most cost-effective:**

- **Scale-to-zero**: €0 when not in use
- **True pay-per-use** (billed per second)
- **Free tier**: 180k vCPU-seconds/month + 360k GiB-seconds/month

**Estimated cost:**

- Light usage: **€0-5/month**
- Medium usage: **€5-15/month**

## 💰 **Option 2: Azure App Service (Free Plan)**

**Advantages:**

- **F1 Free tier**: €0/month
- 1GB RAM, 1GB storage
- 60 minutes CPU/day

**Drawbacks:**

- Strict limitations
- No custom domain
- Goes to sleep after 20min of inactivity

## 📊 **Cost Comparison**

| Service | Minimum Cost | Advantages | Drawbacks |
|---------|-------------|------------|-----------|
| **Container Apps** | €0 (scale-to-zero) | Very flexible, modern | More complex setup |
| **App Service F1** | €0 (free) | Simple, fast | Strict limitations |
| **App Service B1** | ~€13/month | Stable, no limits | Always on = fixed cost |

## 🚀 **My Recommendation: Container Apps**

Let's create the deployment step-by-step:

### 1. Create a Dockerfile

### 2. Create a .dockerignore

### 3. Deployment Commands

```bash
# 1. Log in to Azure
az login

# 2. Set France region
az configure --defaults location=francecentral

# 3. Create a resource group
az group create --name rg-mcp-proxy --location francecentral

# 4. Deploy with Container Apps (simplest method)
az acr build \
  --registry repodemoeric \
  --image mcp-proxy:latest .

az containerapp env create \
  --name mcp-proxy-env \
  --resource-group GRChatGPT \
  --location francecentral \
  --logs-destination none

az containerapp create \
  --name mcp-proxy \
  --resource-group GRChatGPT \
  --environment mcp-proxy-env \
  --image repodemoeric.azurecr.io/mcp-proxy:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --registry-server repodemoeric.azurecr.io \
  --registry-username repodemoeric \
  --registry-password $(az acr credential show --name repodemoeric --query "passwords[0].value" -o tsv)
```

### 4. Optimal Cost-Saving Configuration

```bash
# If you want more control over costs
az containerapp create \
  --name mcp-proxy \
  --resource-group rg-mcp-proxy \
  --environment-name mcp-env \
  --image nginx \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi
```

## 💡 **Tips to Minimize Costs**

1. **Use `--min-replicas 0`** for scale-to-zero
2. **Limit resources**: `--cpu 0.25 --memory 0.5Gi`
3. **Monitor usage** with Azure Cost Management
4. **Enable cost alerts** (e.g., >€10/month)

## 🎯 **Most Cost-Effective Complete Command**

```bash
az containerapp up \
  --name mcp-proxy-eco \
  --resource-group rg-mcp-proxy \
  --location francecentral \
  --source . \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 1 \
  --cpu 0.25 \
  --memory 0.5Gi
```

With this config, you should have **less than €5/month** for normal usage!

Would you like to proceed with the deployment now?
