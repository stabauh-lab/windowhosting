# Roadmap

- [ ] Refresh the homepage with purple-and-white styling, DM fonts, free plan, features and FAQ
- [ ] Verify the refreshed homepage and navigation on desktop and mobile

- [x] Store admin password (1122) as ADMIN_PASSWORD secret
- [x] Generate ADMIN_SESSION_SECRET
- [x] Migration: desktops table gains rdp_ip, rdp_port, rdp_username, rdp_password; 30-day sessions
- [x] Admin gate server functions (password 1122, encrypted session)
- [x] Rewrite /admin: password screen + add Windows RDP machines (IP, user, password)
- [x] Rewrite home: Windows RDP, specs (4 vCPU / 8 GiB / 300 GB / 30 days)
- [x] Rewrite /desktop: show real IP + username + password with copy buttons, 30-day countdown
- [x] Remove Admin link from user header
- [x] Add Monetag meta tag in root head
- [x] Verify build + visual check (gate rejects wrong password, 1122 unlocks)
