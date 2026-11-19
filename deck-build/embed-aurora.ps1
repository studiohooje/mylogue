$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$inputFile = Join-Path $PSScriptRoot 'MWL_Beta_2_1_Aurora_Business_Plan.pptx'
$outputFile = Join-Path $project 'MyWeightLog_Business_Plan_2026-11.pptx'
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
  $presentation = $app.Presentations.Open($inputFile, -1, 0, 0)
  foreach ($slide in $presentation.Slides) {
    foreach ($shape in $slide.Shapes) {
      if ($shape.HasTextFrame -ne -1 -or $shape.TextFrame2.HasText -ne -1) { continue }
      $shape.TextFrame2.TextRange.Font.Name = 'SUIT'
    }
  }
  $presentation.SaveCopyAs2($outputFile, 24, -1, 0)
  Write-Output "slides=$($presentation.Slides.Count) output=$outputFile"
} finally {
  if ($presentation) { $presentation.Close() }
  $app.Quit()
  [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) | Out-Null
}
