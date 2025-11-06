# 🚀 Azure Deployment Guide for NomadNow

## Quick Start (Recommended Method)

### 1. Prerequisites
- Azure account (free tier works)
- GitHub repository with your code
- Git installed locally

### 2. Deploy to Azure Static Web Apps

#### Option A: Azure Portal (Easiest)

1. **Push to GitHub** (if not done):
```bash
git add .
git commit -m "Deploy to Azure"
git push origin main
```

2. **Create Static Web App**:
   - Visit [Azure Portal](https://portal.azure.com)
   - Click "Create a resource"
   - Search "Static Web Apps" → Create
   - Fill configuration:
     - **Name**: `nomadnow-travel-planner`
     - **Region**: Choose closest to your users
     - **Source**: GitHub
     - **Repository**: Your NomadNow repo
     - **Branch**: `main`
     - **Build Details**:
       - App location: `/`
       - Output location: `/`
   - Click "Review + create" → "Create"

3. **Your site will be live** at: `https://[your-app-name].azurestaticapps.net`

#### Option B: Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name nomadnow-rg --location "East US"

# Create static web app
az staticwebapp create \
    --name nomadnow-travel-planner \
    --resource-group nomadnow-rg \
    --source https://github.com/YOUR_USERNAME/YOUR_REPO \
    --location "East US2" \
    --branch main \
    --app-location "/" \
    --output-location "/"
```

## Alternative: Azure Blob Storage

If you prefer manual control:

### 1. Create Storage Account
```bash
az storage account create \
    --name nomadnowstorage$(date +%s) \
    --resource-group nomadnow-rg \
    --location "East US" \
    --sku Standard_LRS \
    --kind StorageV2

# Enable static website
az storage blob service-properties update \
    --account-name nomadnowstorage$(date +%s) \
    --static-website \
    --index-document index.html \
    --404-document index.html
```

### 2. Upload Files
```bash
# Get connection string
az storage account show-connection-string \
    --name nomadnowstorage$(date +%s) \
    --resource-group nomadnow-rg

# Upload files
az storage blob upload-batch \
    --destination '$web' \
    --source . \
    --connection-string "YOUR_CONNECTION_STRING"
```

## Post-Deployment Setup

### 1. Custom Domain (Optional)
- In Azure Portal → Your Static Web App → Custom domains
- Add your domain and verify ownership
- Azure handles SSL certificates automatically

### 2. Environment Variables
- No server-side environment needed
- All APIs are public/keyless as designed

### 3. Monitoring
- Azure provides built-in analytics
- Monitor in Azure Portal → Your app → Overview

## CI/CD Workflow

The included GitHub Action (`/.github/workflows/azure-static-web-apps.yml`) automatically:
- Deploys on every push to `main`
- Creates preview deployments for pull requests
- Optimizes static assets

## Troubleshooting

### Common Issues:

1. **Build Failures**: 
   - Check GitHub Actions tab for errors
   - Ensure all files are committed

2. **API Cors Issues**:
   - APIs used are CORS-enabled
   - If issues persist, check browser console

3. **Routing Issues**:
   - `staticwebapp.config.json` handles SPA routing
   - All routes redirect to `index.html`

### Support Resources:
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions for Static Web Apps](https://github.com/Azure/static-web-apps-deploy)

## Cost Estimation

**Azure Static Web Apps (Free Tier)**:
- ✅ Free hosting
- ✅ Free SSL certificates
- ✅ Free custom domains
- ✅ 100GB bandwidth/month
- ✅ Global CDN

**Paid features** (if needed):
- Additional bandwidth: $0.20/GB
- Authentication providers: Free

## Performance Optimization

Your app is already optimized for static hosting:
- ✅ No build process needed
- ✅ Client-side caching implemented
- ✅ Efficient API usage
- ✅ Responsive images

Deployed app will have:
- **Global CDN** distribution
- **HTTP/2** support
- **Gzip compression**
- **Lighthouse scores 90+**

---

🎉 **Your NomadNow travel planner will be live and globally accessible!**