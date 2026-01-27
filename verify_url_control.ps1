$Headers = @{ "x-admin-key" = "admin123"; "Content-Type" = "application/json" }
$BaseUrl = "http://localhost:3001/admin/users"
$Username = "test_control_user"

Write-Host "--- 1. Creating Test User ---" -ForegroundColor Cyan
try {
    $body = @{ username = $Username } | ConvertTo-Json
    $user = Invoke-RestMethod -Uri $BaseUrl -Method Post -Headers $Headers -Body $body
    Write-Host "User created: $($user.username)" -ForegroundColor Green
    Write-Host "URL: $($user.playlistUrl)" -ForegroundColor Gray
} catch {
    Write-Host "User might already exist or error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n--- 2. Listing Users ---" -ForegroundColor Cyan
$users = Invoke-RestMethod -Uri $BaseUrl -Method Get -Headers $Headers
if ($users.Count -gt 0) {
    Write-Host "Found $($users.Count) users." -ForegroundColor Green
    $users | Select-Object username, is_active, playlistUrl | Format-Table -AutoSize
} else {
    Write-Host "No users found?" -ForegroundColor Red
}

Write-Host "`n--- 3. Disabling User ---" -ForegroundColor Cyan
$bodyDisable = @{ is_active = $false } | ConvertTo-Json
$disabledUser = Invoke-RestMethod -Uri "$BaseUrl/$Username/status" -Method Put -Headers $Headers -Body $bodyDisable
if ($disabledUser.is_active -eq $false) {
    Write-Host "User $Username is now DISABLED." -ForegroundColor Green
} else {
    Write-Host "Failed to disable user." -ForegroundColor Red
}

Write-Host "`n--- 4. Regenerating Token ---" -ForegroundColor Cyan
$regenUser = Invoke-RestMethod -Uri "$BaseUrl/$Username/regenerate" -Method Post -Headers $Headers
Write-Host "Old Token URL (from creation): CHECK ABOVE" -ForegroundColor Gray
Write-Host "New Token URL: $($regenUser.playlistUrl)" -ForegroundColor Green

if ($regenUser.token) {
     Write-Host "Token regenerated successfully." -ForegroundColor Green
}

Write-Host "`n--- 5. Enabling User Back ---" -ForegroundColor Cyan
$bodyEnable = @{ is_active = $true } | ConvertTo-Json
$enabledUser = Invoke-RestMethod -Uri "$BaseUrl/$Username/status" -Method Put -Headers $Headers -Body $bodyEnable
if ($enabledUser.is_active -eq $true) {
    Write-Host "User $Username is now ENABLED." -ForegroundColor Green
} else {
    Write-Host "Failed to enable user." -ForegroundColor Red
}
