# Creates the RefreshAssetInventory SharePoint list on CCHMCRefreshSupport site.
# This list will hold ~65k device records and needs an indexed DeviceName column.

param(
    [string]$SiteUrl = "https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport"
)

# Connect if not already connected
try {
    Get-PnPContext | Out-Null
} catch {
    Connect-PnPOnline -Url $SiteUrl -Interactive
}

$listName = "RefreshAssetInventory"

# Create the list
Write-Host "Creating list: $listName"
New-PnPList -Title $listName -Template GenericList -ErrorAction Stop

# Add columns
Write-Host "Adding columns..."
Add-PnPField -List $listName -DisplayName "DeviceName" -InternalName "DeviceName" -Type Text -Required $true
Add-PnPField -List $listName -DisplayName "SerialNumber" -InternalName "SerialNumber" -Type Text
Add-PnPField -List $listName -DisplayName "Make" -InternalName "Make" -Type Text
Add-PnPField -List $listName -DisplayName "Model" -InternalName "Model" -Type Text

# Remove default Title column requirement
Set-PnPField -List $listName -Identity "Title" -Values @{Required=$false; Hidden=$true}

# CRITICAL: Index the DeviceName column for delegable LookUp queries
Write-Host "Indexing DeviceName column for delegation..."
$field = Get-PnPField -List $listName -Identity "DeviceName"
$field.Indexed = $true
$field.Update()
Invoke-PnPQuery

Write-Host ""
Write-Host "RefreshAssetInventory list created with indexed DeviceName column."
Write-Host ""
Write-Host "IMPORTANT: SharePoint list view threshold is 5,000 items."
Write-Host "With ~65k items, you MUST use indexed columns for all queries."
Write-Host "The DeviceName column has been indexed for delegable LookUp from Power Apps."
Write-Host ""
Write-Host "Next step: Set up the Power Automate flow to populate this list"
Write-Host "from Refresh Asset Data.xlsx (see Task 3 in the implementation plan)."
