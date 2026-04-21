# jamie-os Deployment & Infrastructure

**Status:** ✅ Live on Vercel  
**Free Tier:** Yes  
**Runtime:** Static site (no serverless functions)

---

## Deployment Locations

### GitHub Repository
- **URL:** https://github.com/jamie-ludlow/jamie-os
- **Repo:** jamie-ludlow/jamie-os
- **Visibility:** Public
- **Status:** ✅ All code pushed

### Vercel Deployment
- **Project:** leadrise/jamie-os
- **Latest Deployment:** ✅ Ready
- **URL Pattern:** https://jamie-{hash}-leadrise.vercel.app
- **Auto-Deploy:** Enabled (pushes to main trigger builds)
- **Build Time:** ~25s
- **Build Method:** Static generation (0 serverless runtime)

### Vercel Project Details
```
Team: leadrise
Project: jamie-os
Framework: Next.js
Build Command: npm run build
Output Directory: .next
Development Command: npm run dev
```

---

## Free Tier Benefits

✅ **Vercel Free Includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Serverless Functions (if needed later)
- Automatic HTTPS
- Git integration
- Preview deployments
- No credit card required (initially)

✅ **Why We're Free:**
- Static site (no serverless compute)
- ~500KB bundle size
- Minimal bandwidth usage
- No database queries at runtime

---

## Deployment Workflow

### Automatic Deployments
Every push to `main` triggers:
1. GitHub webhook to Vercel
2. Vercel pulls latest code
3. Runs `npm install --legacy-peer-deps`
4. Runs `npm run build`
5. Deploys to production

### Manual Deployments
```bash
# From your machine
vercel --prod --yes

# From CI/CD
vercel deploy --prod
```

---

## Environment Variables

### Local Development
Create `.env.local` (not committed):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Vercel Dashboard
When ready to add Supabase:
1. Go to: vercel.com/leadrise/jamie-os
2. Settings → Environment Variables
3. Add secrets (same names as above)
4. Trigger rebuild

⚠️ **Note:** Currently no env vars needed (static site prototype)

---

## Custom Domain (Optional)

To add a custom domain:
1. Go to Vercel dashboard
2. Project Settings → Domains
3. Add your domain
4. Configure DNS per Vercel instructions
5. Enable HTTPS (automatic)

---

## Builds & Deployments

### Build Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "nodeVersion": "20.x"
}
```

### .npmrc Configuration
```
legacy-peer-deps=true
```
(Allows framer-motion and other peer dependencies to resolve cleanly)

### .vercelignore
Files automatically ignored:
- `.git/`
- `.env.local`
- `node_modules/`
- `docs/` (documentation, not deployed)

---

## Performance

### Current Metrics
- **Build Time:** ~25 seconds
- **Static Pages:** 5 (/, /tasks, /board, /search, /settings)
- **Bundle Size:** ~500KB
- **Time to First Byte:** <100ms
- **Lighthouse Score:** Expected >95

---

## Continuous Integration

### GitHub Actions (Optional Future)

When ready for testing/linting before deploy:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci --legacy-peer-deps
      - run: npm run lint
      - run: npm run build
```

---

## Rollback

If a deployment fails or needs rollback:
```bash
# List recent deployments
vercel list

# Promote an old deployment to production
vercel promote https://jamie-{old-hash}-leadrise.vercel.app
```

---

## Cost Optimization

**Current Status:** Free tier sufficient for prototype

**Triggers for upgrade:**
- Need serverless functions (API routes, real-time updates)
- Bandwidth exceeds 100GB/month
- Need faster build times
- Multiple team members

---

## Monitoring

### Vercel Dashboard
- Deployment logs: vercel.com/leadrise/jamie-os
- Analytics: Edge requests, response times
- Error tracking: 4xx/5xx responses

### GitHub Actions Logs
- Build logs: github.com/jamie-ludlow/jamie-os/actions

---

## Next Steps for Production

### Phase 1: Backend API (When Needed)
1. Create Supabase project or use Mission Control
2. Add environment variables to Vercel
3. Build repository layer in `lib/tasks/TaskRepository.ts`
4. Add API routes in `app/api/tasks/` if needed

### Phase 2: Real-Time Updates
1. Add Supabase real-time subscriptions
2. Update components to listen for changes
3. Test with multiple browser tabs

### Phase 3: Deployment Zones
1. Consider regional deployment for lower latency
2. Use Vercel Edge Functions if needed
3. Implement caching strategies

---

## Debugging Deployment Issues

### If build fails:
```bash
# 1. Check build locally
npm run build

# 2. Check Vercel logs
vercel logs --env production

# 3. Check git status
git status

# 4. Force rebuild
vercel deploy --prod --yes
```

### If site shows 404:
- Check `/public/` folder exists
- Check routes in `app/` folder
- Verify `.next/` was generated

### If styles missing:
- Clear Vercel cache: `vercel rebuild`
- Check CSS imports in `app/globals.css`
- Verify Tailwind config

---

## Security

✅ **HTTPS:** Automatic with Vercel (all deployments encrypted)

✅ **Environment Secrets:** Not visible in logs or frontend

⚠️ **NEXT_PUBLIC_* variables:** These ARE sent to browser (use for public keys only)

```bash
# Public (safe in frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Secret (server-only, never send to frontend)
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## GitHub-Vercel Integration

### How It Works
1. Push to `main` branch → GitHub webhook fires
2. Vercel receives webhook
3. Clones repo
4. Runs build
5. Deploys if successful
6. Comment on PR with preview URL (if PR)

### Preview Deployments
- Every pull request gets unique deployment URL
- Share for review before merging
- Auto-deleted when PR closes

---

## Vercel CLI Commands

```bash
# Check who's logged in
vercel whoami

# View project status
vercel ls
vercel list

# Deploy to production
vercel --prod --yes

# Deploy to preview
vercel --yes

# Check deployment logs
vercel logs
vercel logs --env production

# Environment variables
vercel env list
vercel env add NAME VALUE

# Rollback
vercel promote <deployment-url>

# Link to existing project
vercel link

# Unlink project
vercel unlink
```

---

## GitHub CLI Commands

```bash
# Push to main
git push origin main

# Create pull request
gh pr create

# List deployments
gh deployment list

# View repo
gh repo view
```

---

## Maintenance

### Monthly
- ✅ Check Vercel analytics
- ✅ Review GitHub security alerts
- ✅ Update dependencies: `npm update`

### Quarterly
- ✅ Major dependency updates
- ✅ Performance optimization review
- ✅ Cost optimization review

### As Needed
- ✅ Emergency deployments
- ✅ Rollbacks
- ✅ Hotfixes

---

## Cost Breakdown (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Vercel  | Free | $0 |
| GitHub  | Free | $0 |
| Supabase (reusing MC) | Free | $0 |
| **Total** | | **$0** |

---

## Support & Resources

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- GitHub Docs: https://docs.github.com
- Supabase Docs: https://supabase.com/docs

---

**Deployed:** April 21, 2026  
**Status:** ✅ Live and running on free tier  
**Next Review:** After Phase 3 (task features complete)
