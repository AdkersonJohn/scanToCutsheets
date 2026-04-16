# Creates the StandardModels SharePoint list on CCHMCRefreshSupport site.
# Run with: Connect-PnPOnline first, then ./Create-StandardModelsList.ps1

param(
    [string]$SiteUrl = "https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport"
)

# Connect if not already connected
try {
    Get-PnPContext | Out-Null
} catch {
    Connect-PnPOnline -Url $SiteUrl -Interactive
}

$listName = "StandardModels"

# Create the list (GenericList = custom list)
Write-Host "Creating list: $listName"
New-PnPList -Title $listName -Template GenericList -ErrorAction Stop

# Add columns
Write-Host "Adding columns..."
Add-PnPField -List $listName -DisplayName "Make" -InternalName "Make" -Type Text -Required $true
Add-PnPField -List $listName -DisplayName "Model" -InternalName "Model" -Type Text -Required $true
Add-PnPField -List $listName -DisplayName "DeviceCount" -InternalName "DeviceCount" -Type Number

# Remove default Title column requirement
Set-PnPField -List $listName -Identity "Title" -Values @{Required=$false; Hidden=$true}

Write-Host "StandardModels list created successfully."
Write-Host ""
Write-Host "Next step: Import data from src/sharepoint/standard-models.csv"
Write-Host "You can use the SharePoint UI: List Settings > Import from CSV"
Write-Host "Or use Import-Csv + Add-PnPListItem in PowerShell."
