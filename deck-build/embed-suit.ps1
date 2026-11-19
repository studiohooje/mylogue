$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$inputFile = Join-Path $project 'deck-final\MWL_Beta_2_0_Business_Plan_SUIT_Final.pptx'
$outputFile = Join-Path $project 'deck-final\MWL_Beta_2_0_Business_Plan_SUIT_Embedded.pptx'
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
    $presentation = $app.Presentations.Open($inputFile, -1, 0, 0)
    $changed = 0
    foreach ($slide in $presentation.Slides) {
        foreach ($shape in $slide.Shapes) {
            if ($shape.HasTextFrame -ne -1 -or $shape.TextFrame2.HasText -ne -1) { continue }
            $range = $shape.TextFrame2.TextRange
            if ([string]::IsNullOrWhiteSpace($range.Text)) { continue }
            $range.Font.Name = 'SUIT'
            if ($range.Font.Size -ge 30) {
                $range.Font.Spacing = -0.15
            } else {
                $range.Font.Spacing = 0
            }
            $changed++
        }
    }
    $presentation.SaveCopyAs2($outputFile, 24, -1, 0)
    Write-Output "text_shapes=$changed"
} finally {
    if ($presentation) { $presentation.Close() }
    $app.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) | Out-Null
}
