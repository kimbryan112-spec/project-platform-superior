Set WshShell = CreateObject("WScript.Shell")
' 1. Bubuksan ang Node.js Server sa background
WshShell.Run "cmd.exe /c cd /d C:\Users\yang\Documents\project-platform-superior && node server.js", 0, False

' 2. Bubuksan din ang Cloudflare Tunnel sa background (Palitan ang yong-tunnel ng actual tunnel name mo kung kinakailangan)
WshShell.Run "cmd.exe /c cloudflared tunnel run projectplatformv5", 0, False