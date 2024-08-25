Clear-Host

Write-Host "1. Install Node LTS (20.x)"
Write-Host "2. Install GDAL"
Write-Host "3. Install QGIS (to get coordinates)"
Write-Host "4. Install MeshLab or similar (to view .obj/.glb files)"

Read-Host -Prompt "Press Enter to continue"
Clear-Host

Write-Host "Put these files in this folder and name them this way:"
Write-Host "1. GeoTIFF file of height map as 'heightmap.tif'"
Write-Host "2. GeoTIFF file of image/satellite image as 'image.tif'"

$heightmap_input = "heightmap.tif"
$image_input = "image.tif"

Read-Host -Prompt "Press Enter to continue"
Clear-Host

$gdal_path = ''
$gdal_path = Read-Host -Prompt "Enter path to gdal_translate (default: 'C:\Program Files\GDAL\gdal_translate.exe')"
if ($gdal_path -eq '') {
  $gdal_path = "C:\Program Files\GDAL\gdal_translate.exe"
}

$x1 = Read-Host -Prompt "Enter x1 (top left x coordinate)"
$y1 = Read-Host -Prompt "Enter y1 (top left y coordinate)"
$x2 = Read-Host -Prompt "Enter x2 (bottom right x coordinate)"
$y2 = Read-Host -Prompt "Enter y2 (bottom right y coordinate)"
$x3 = $x1
$y3 = $y2

$heightmap_cropped_output = "heightmap_cropped.tif"
$heightmap_obj_output = "heightmap.obj"
$heightmap_glbx_output = "heightmap.glb"

$buildings_glbx_output = "buildings.glb"

$image_cropped_output = "image_cropped.tif"
$image_texture_output = "texture.png"

$simplify_mesh_deviation = ''
$simplify_mesh_deviation = Read-Host -Prompt "Enter simplify mesh deviation in meters (default: 0.5) Try 1.5 - 2 for 1m resolution data. If output is >100 MB / slow to render try a larger value."
if ($simplify_mesh_deviation -eq '') {
  $simplify_mesh_deviation = 0.5
}

$node_memory = ''
$node_memory = Read-Host -Prompt "Enter node memory in MB (default: 512) Try larger values if node crashes with out of memory error."
if ($node_memory -eq '') {
  $node_memory = 512
}

Clear-Host
Write-Host "Cropping heightmap..."

Start-Process -FilePath $gdal_path -ArgumentList "-projwin",$x1,$y1,$x2,$y2,$heightmap_input,$heightmap_cropped_output -Wait

Write-Host "Cropping image..."
Start-Process -FilePath $gdal_path -ArgumentList "-projwin",$x1,$y1,$x2,$y2,$image_input,$image_cropped_output -Wait
Write-Host "Converting image to texture..."
Start-Process -FilePath $gdal_path -ArgumentList $image_cropped_output,$image_texture_output -Wait

Write-Host "Running simplify_mesh..."
Set-Location .\preprocessing
Write-Host "npm install"
npm install
Set-Location ..
Write-Host "node simplify_mesh"
node --max-old-space-size=$node_memory './preprocessing/simplify_mesh.mjs' $heightmap_cropped_output $heightmap_obj_output $simplify_mesh_deviation

Write-Host "Done with mesh!"

$generated_buildings = $false
$want_buildings = Read-Host -Prompt "Do you want to generate buildings? (default: y/n)"
if ($want_buildings -eq 'y' || $want_buildings -eq '') {
  Clear-Host
  $tile_x1 = Read-Host -Prompt "Enter tile x1 (top left)"
  $tile_y1 = Read-Host -Prompt "Enter tile y1 (top left)"
  $tile_x2 = Read-Host -Prompt "Enter tile x2 (bottom right)"
  $tile_y2 = Read-Host -Prompt "Enter tile y2 (bottom right)"

  $osm_key = Read-Host -Prompt "Enter onegeo key from email:"

  Write-Host "Running get_buildings..."
  New-Item -Path ".\preprocessing\buildings" -ItemType Directory

  $buildings_path = "./preprocessing/buildings/"
  $buildings_output = "buildings.obj"

  Write-Host "node get_buildings"
  node './preprocessing/get_buildings.mjs' $tile_x1 $tile_y1 $tile_x2 $tile_y2 $buildings_path $osm_key
  Write-Host "node osm_to_obj"
  node './preprocessing/osm_to_obj.mjs' $x3 $y3 $heightmap_obj_output $buildings_path $buildings_output

  Write-Host "Done with buildings!"
  $generated_buildings = $true
}

$want_glb = Read-Host -Prompt "Do you want to generate glb? (default: y/n)"
if ($want_glb -eq 'y' || $want_glb -eq '') {
  Clear-Host
  Write-Host "Running gltfpack..."

  Copy-Item -Path $heightmap_obj_output -Destination .\preprocessing
  Copy-Item -Path $image_texture_output -Destination .\preprocessing
  if ($generated_buildings -eq $true) {
    Copy-Item -Path $buildings_output -Destination .\preprocessing
  }
  Set-Location .\preprocessing
  npx gltfpack -noq -i $heightmap_obj_output -o $heightmap_glbx_output
  Move-Item -Path $heightmap_glbx_output -Destination ".." -Force
  if ($generated_buildings -eq $true) {
    npx gltfpack -noq -i $buildings_output -o $buildings_glbx_output
    Move-Item -Path $buildings_glbx_output -Destination ".." -Force
  }
  Remove-Item $heightmap_obj_output
  Remove-Item $image_texture_output
  if ($generated_buildings -eq $true) {
    Remove-Item $buildings_output
  }
  Set-Location ..

  Write-Host "Done with glb!"
}