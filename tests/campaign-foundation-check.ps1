param([string]$Root = (Resolve-Path "$PSScriptRoot/.."))

$ErrorActionPreference = 'Stop'

function Assert-True([bool]$Condition, [string]$Name) {
  if (-not $Condition) { throw "CHECK FAILED: $Name" }
  "PASS: $Name"
}

$campaign = Join-Path $Root 'src/campaign/mission-data.js'
Assert-True (Test-Path $campaign) 'campaign data file exists'

$raw = Get-Content $campaign -Raw
Assert-True (([regex]::Matches($raw,"campaignMission\('M\d{2}'")).Count -eq 40) 'contains forty mission ids'
Assert-True (($raw -match 'const CAMPAIGN_MISSIONS') -and ($raw -match 'Object\.freeze')) 'mission roster is immutable'
Assert-True (($raw -match "campaignMission\('M01'") -and ($raw -match "campaignMission\('M40'")) 'first and final map nodes exist'
Assert-True (($raw -match "'scene-01'") -and ($raw -match "'scene-40'")) 'every endpoint has a scene id'
Assert-True (($raw -match 'airProfile,sceneId') -and (([regex]::Matches($raw,"'(fuelCut|airIntel|flakBroken|railOpen|radarBlind|supplyBurned|damSignal|skyWindow)'")).Count -ge 8)) 'air and persistent effect metadata exist'

$screensRaw = Get-Content (Join-Path $Root 'src/ui/screens.js') -Raw
$directorRaw = Get-Content (Join-Path $Root 'src/missions/director.js') -Raw
Assert-True (($screensRaw -match 'MISSIONS.length') -and ($directorRaw -match 'MISSIONS.length')) 'campaign UI and victory limits are data-driven'

$bootRaw = Get-Content (Join-Path $Root 'src/boot.js') -Raw
Assert-True ($bootRaw -match 'src/campaign/mission-data.js') 'boot loads campaign roster'

$profilePath = Join-Path $Root 'src/profile/profile-store.js'
Assert-True (Test-Path $profilePath) 'profile store exists'
$profileRaw = Get-Content $profilePath -Raw
Assert-True ($profileRaw -match "const PROFILE_STORAGE_KEY='t34war_profiles_v1'") 'versioned profile storage key exists'
Assert-True ($profileRaw -match "localStorage.getItem\('t34war_v2'\)") 'legacy progress migration exists'
Assert-True ($profileRaw -match 'function saveActiveProfile\(') 'active profile save function exists'
Assert-True ($bootRaw -match 'src/profile/profile-store.js') 'boot loads profiles before screens'

$profileUiPath = Join-Path $Root 'src/profile/profile-ui.js'
Assert-True (Test-Path $profileUiPath) 'profile UI module exists'
$html = Get-Content (Join-Path $Root 'game.html') -Raw
Assert-True ($html -match 'id="profileSelect"') 'profile screen container exists'
$profileCssPath = Join-Path $Root 'styles/profile.css'
Assert-True (Test-Path $profileCssPath) 'profile stylesheet exists'
Assert-True ((Get-Content $profileCssPath -Raw) -match '--olive-light:\s*#e6ead1') 'profile palette token exists'
