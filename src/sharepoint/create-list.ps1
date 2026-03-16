# Create SharePoint List for Computer Asset Scans
# Requires: PnP.PowerShell module (Install-Module PnP.PowerShell)
#
# Usage:
#   Connect-PnPOnline -Url "https://yourtenant.sharepoint.com/sites/yoursite" -Interactive
#   .\create-list.ps1

param(
    [string]$ListName = "Computer Asset Scans"
)

Write-Host "Creating SharePoint list: $ListName" -ForegroundColor Cyan

# Check if list exists
$existingList = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue

if ($existingList) {
    Write-Host "List '$ListName' already exists. Skipping creation." -ForegroundColor Yellow
    exit 0
}

# Create the list
$list = New-PnPList -Title $ListName -Template GenericList -EnableVersioning

Write-Host "List created. Adding columns..." -ForegroundColor Green

# Add BarcodeValue column (required text)
Add-PnPField -List $ListName -DisplayName "Barcode Value" -InternalName "BarcodeValue" -Type Text -Required -AddToDefaultView
Set-PnPField -List $ListName -Identity "BarcodeValue" -Values @{
    MaxLength = 128
    Indexed = $true
}

Write-Host "  Added: Barcode Value" -ForegroundColor Gray

# Add ScannedBy column (person)
Add-PnPField -List $ListName -DisplayName "Scanned By" -InternalName "ScannedBy" -Type User -Required -AddToDefaultView

Write-Host "  Added: Scanned By" -ForegroundColor Gray

# Add ScannedDate column (datetime)
Add-PnPField -List $ListName -DisplayName "Scanned Date" -InternalName "ScannedDate" -Type DateTime -Required -AddToDefaultView
Set-PnPField -List $ListName -Identity "ScannedDate" -Values @{
    DisplayFormat = "DateTime"
    Indexed = $true
}

Write-Host "  Added: Scanned Date" -ForegroundColor Gray

# Add Location column (optional text)
Add-PnPField -List $ListName -DisplayName "Location" -InternalName "Location" -Type Text -AddToDefaultView
Set-PnPField -List $ListName -Identity "Location" -Values @{
    MaxLength = 255
}

Write-Host "  Added: Location" -ForegroundColor Gray

# Add Notes column (optional multi-line text)
Add-PnPField -List $ListName -DisplayName "Notes" -InternalName "Notes" -Type Note
Set-PnPField -List $ListName -Identity "Notes" -Values @{
    NumberOfLines = 6
    RichText = $false
    AppendOnly = $false
}

Write-Host "  Added: Notes" -ForegroundColor Gray

# Create views
Write-Host "Creating views..." -ForegroundColor Green

# Today's Scans view
Add-PnPView -List $ListName -Title "Today's Scans" -Fields "BarcodeValue", "ScannedBy", "ScannedDate", "Location" -Query "<Where><Geq><FieldRef Name='ScannedDate' /><Value Type='DateTime'><Today /></Value></Geq></Where><OrderBy><FieldRef Name='ScannedDate' Ascending='FALSE' /></OrderBy>"

Write-Host "  Created: Today's Scans view" -ForegroundColor Gray

# My Scans view
Add-PnPView -List $ListName -Title "My Scans" -Fields "BarcodeValue", "ScannedDate", "Location", "Notes" -Query "<Where><Eq><FieldRef Name='ScannedBy' /><Value Type='Integer'><UserID /></Value></Eq></Where><OrderBy><FieldRef Name='ScannedDate' Ascending='FALSE' /></OrderBy>"

Write-Host "  Created: My Scans view" -ForegroundColor Gray

# Update default view
$defaultView = Get-PnPView -List $ListName -Identity "All Items"
Set-PnPView -List $ListName -Identity $defaultView.Id -Fields "BarcodeValue", "ScannedBy", "ScannedDate", "Location"

Write-Host "  Updated: Default view" -ForegroundColor Gray

Write-Host "`nSharePoint list '$ListName' created successfully!" -ForegroundColor Green
Write-Host "List URL: $((Get-PnPList -Identity $ListName).RootFolder.ServerRelativeUrl)" -ForegroundColor Cyan
