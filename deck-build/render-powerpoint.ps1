$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$inputFile = Join-Path $project 'deck-final\MWL_Beta_2_0_Business_Plan_SUIT_Validated_v2.pptx'
$output = Join-Path $project 'artifacts\business-deck-suit-powerpoint-v2'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
    $presentation = $app.Presentations.Open($inputFile, -1, 0, 0)
    foreach ($slide in $presentation.Slides) {
        $file = Join-Path $output ('slide-{0:D2}.png' -f $slide.SlideIndex)
        $slide.Export($file, 'PNG', 1280, 720)
    }
    Write-Output "rendered=$($presentation.Slides.Count)"
} finally {
    if ($presentation) { $presentation.Close() }
    $app.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) | Out-Null
}
