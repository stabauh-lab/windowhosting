# Roadmap

- [x] Store admin password (1122) as ADMIN_PASSWORD secret
- [ ] Generate ADMIN_SESSION_SECRET
- [ ] Migration: desktops table gains rdp_ip, rdp_port, rdp_username, rdp_password; 30-day sessions
- [ ] Admin gate server functions (password 1122, encrypted session)
- [ ] Rewrite /admin: password screen + add Windows RDP machines (IP, user, password)
- [ ] Rewrite home: Windows RDP, specs (4 vCPU / 8 GiB / 300 GB / 30 days)
- [ ] Rewrite /desktop: show real IP + username + password with copy buttons, 30-day countdown
- [ ] Remove Admin link from user header
- [ ] Add Monetag meta tag in root head
- [ ] Verify build
