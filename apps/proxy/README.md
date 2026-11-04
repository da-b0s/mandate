# Vercel front door

Forwards every request to the web app on Render. Exists so the public address is a
`*.vercel.app` domain: the Slush wallet flags `*.onrender.com` subdomains when connecting.

Deploy: import the repo on vercel.com with **Root Directory = `apps/proxy`**, framework "Other",
no build command. No environment variables are needed here.
