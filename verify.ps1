$adminKey = "admin123"
$baseUrl = "http://localhost:3000"

Write-Host "1. Creating User..."
try {
    $userResponse = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Method Post -Headers @{"x-admin-key"=$adminKey} -ContentType "application/json" -Body '{"username":"verifyUser"}'
    Write-Host "User Created: $($userResponse.username)"
    $token = $userResponse.token
    Write-Host "Token: $token"
} catch {
    Write-Error "Failed to create user: $_"
    exit 1
}

Write-Host "2. Fetching Playlist..."
try {
    $m3uUrl = "$baseUrl/playlist.m3u?token=$token"
    $m3uContent = Invoke-WebRequest -Uri $m3uUrl -UseBasicParsing
    
    if ($m3uContent.StatusCode -eq 200) {
        Write-Host "Playlist fetched successfully!"
        Write-Host "Content Preview:"
        Write-Host $m3uContent.Content.Substring(0, [math]::Min(100, $m3uContent.Content.Length))
    } else {
        Write-Error "Failed to fetch playlist. Status: $($m3uContent.StatusCode)"
        exit 1
    }
} catch {
    Write-Error "Failed to fetch playlist: $_"
    exit 1
}

Write-Host "VERIFICATION COMPLETE"
