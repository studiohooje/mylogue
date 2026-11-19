$ErrorActionPreference='Stop'
$project=Split-Path -Parent $PSScriptRoot
$file=Join-Path $project 'MyWeightLog_Business_Plan_2026-11.pptx'
$out=Join-Path $project 'artifacts\business-deck-aurora-powerpoint'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$app=New-Object -ComObject PowerPoint.Application
$presentation=$null
try{
 $presentation=$app.Presentations.Open($file,-1,0,0)
 foreach($slide in $presentation.Slides){$slide.Export((Join-Path $out ('slide-{0:D2}.png' -f $slide.SlideIndex)),'PNG',1280,720)}
 Write-Output "rendered=$($presentation.Slides.Count)"
}finally{
 if($presentation){$presentation.Close()}
 $app.Quit()
 [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($app)|Out-Null
}
