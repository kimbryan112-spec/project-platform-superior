# Start Node.js Server and Cloudflare Tunnel in background
Start-Process node -ArgumentList "server.js" -WorkingDirectory "C:\Users\yang\Documents\project-platform-superior" -WindowStyle Hidden
Start-Process cloudflared -ArgumentList "tunnel run projectplatformv5" -WindowStyle Hidden

# Add Tray Icon
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon("C:\Users\yang\Documents\project-platform-superior\kbhfilms.ico")
$notifyIcon.Text = "Project Platform (Online)"
$notifyIcon.Visible = $true

$contextMenu = New-Object System.Windows.Forms.ContextMenu
$contextMenu.MenuItems.Add("Open Dashboard", { Start-Process "https://projectplatformv5.kbhfilms.com/pages/admin.html" })
$contextMenu.MenuItems.Add("Stop & Exit", { 
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
    $notifyIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.ContextMenu = $contextMenu
[System.Windows.Forms.Application]::Run()