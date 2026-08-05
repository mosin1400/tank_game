param([string]$Root = (Resolve-Path "$PSScriptRoot/.."))

$ErrorActionPreference = 'Stop'

function Assert-True([bool]$Condition, [string]$Name) {
  if (-not $Condition) { throw "CHECK FAILED: $Name" }
  "PASS: $Name"
}

$campaign = Join-Path $Root 'src/campaign/mission-data.js'
Assert-True (Test-Path $campaign) 'campaign data file exists'

$raw = Get-Content $campaign -Raw
Assert-True (($raw -split "id:'M").Count -eq 41) 'contains forty mission ids'
Assert-True (($raw -match 'const CAMPAIGN_MISSIONS') -and ($raw -match 'Object\.freeze')) 'mission roster is immutable'

$bootRaw = Get-Content (Join-Path $Root 'src/boot.js') -Raw
Assert-True ($bootRaw -match 'src/campaign/mission-data.js') 'boot loads campaign roster'
Assert-True ($bootRaw -match 'src/profile/profile-store.js') 'boot loads profiles before screens'

$mapRaw = Get-Content (Join-Path $Root 'src/ui/campaign-map.js') -Raw
Assert-True ($mapRaw -match 'renderCampaignMap') 'map renderer exists'

$airRaw = Get-Content (Join-Path $Root 'src/combat/air-operations.js') -Raw
Assert-True ($airRaw -match 'scheduleAirStrike') 'air operation scheduler exists'
