import {
  Group, BoxGeometry, Mesh, MeshLambertMaterial, CircleGeometry, DoubleSide,
} from 'three';
import {MODE} from '../constants';

export default (parent, config) => {
  let geometry = null;
  let mesh = null;
  let material = null;
  const group = new Group();
  group.position.y = config.tableHeight / 2;
  group.position.z = config.tablePositionZ;

  material = new MeshLambertMaterial({
    color: config.colors.BLUE_TABLE,
  });

  let tableDepth = config.tableDepth / 2;

  // player half
  geometry = new BoxGeometry(config.tableWidth, config.tableThickness, tableDepth);
  if (geometry.faces) {
    delete geometry.faces[10];
    delete geometry.faces[11];
    geometry.faces = geometry.faces.filter(a => a !== undefined);
  }
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableHeight / 2 - config.tableThickness / 2;
  mesh.position.z = config.tableDepth / 4;
  mesh.name = 'table-self';
  mesh.receiveShadow = true;
  group.add(mesh);

  material = new MeshLambertMaterial({
    color: config.colors.BLUE_TABLE,
  });

  if (config.mode === MODE.MULTIPLAYER) {
    // opponent half
    geometry = new BoxGeometry(config.tableWidth, config.tableThickness, tableDepth);
    delete geometry.faces[8];
    delete geometry.faces[9];
    geometry.faces = geometry.faces.filter(a => a !== undefined);
    mesh = new Mesh(geometry, material);
    mesh.position.y = config.tableHeight / 2 - config.tableThickness / 2;
    mesh.position.z = -config.tableDepth / 4;
    mesh.name = 'table-opponent';
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const upwardsTableGroup = new Group();
  const upwardsTableHeight = config.tableDepth * 0.37;
  upwardsTableGroup.name = 'upwardsTableGroup';
  upwardsTableGroup.visible = false;
  upwardsTableGroup.rotation.x = Math.PI / 2;
  upwardsTableGroup.position.y = config.tableHeight / 2 + upwardsTableHeight / 2;
  upwardsTableGroup.position.z = -config.tableThickness / 2;
  geometry = new BoxGeometry(config.tableWidth, config.tableThickness, upwardsTableHeight);
  material = new MeshLambertMaterial({
    color: config.colors.PINK_TABLE_UPWARDS,
  });
  mesh = new Mesh(geometry, material);
  mesh.name = 'table-self-singleplayer';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  upwardsTableGroup.add(mesh);

  // START TARGET CODE
  // Calculate target radius based on the area of the physics collision face (config.tableWidth * config.tableHeight)
  const effectiveWallWidth = config.tableWidth;
  const effectiveWallHeight = config.tableHeight; // Using physics body height dimension for consistency
  const targetRadius = Math.sqrt((effectiveWallWidth * effectiveWallHeight) / (4 * Math.PI));

  // const targetRadius = config.tableWidth * 0.1; // Old radius
  const targetGeometry = new CircleGeometry(targetRadius, 32);
  const targetMaterial = new MeshLambertMaterial({
    color: 0xFFFF00, // Bright yellow
    side: DoubleSide // Make sure it's visible from the direction of the player
  });
  const lifeTarget = new Mesh(targetGeometry, targetMaterial);

  // Position the target on the surface of 'table-self-singleplayer'
  lifeTarget.position.y = config.tableThickness / 2 + 0.005; // Slightly above the wall surface
  lifeTarget.position.x = 0; // Centered horizontally
  lifeTarget.position.z = 0; // Centered vertically on the wall (upwardsTableHeight)
  
  // Rotate the target to be flush with the wall face
  // The CircleGeometry is in the XY plane by default. The upwardsTableGroup is rotated PI/2 on its X-axis.
  // We want the circle to be in the XZ plane of the upwardsTableGroup so it faces the player after the group's rotation.
  // So, we rotate the circle by PI/2 around its own X-axis.
  lifeTarget.rotation.x = Math.PI / 2;

  lifeTarget.name = 'target-life';
  upwardsTableGroup.add(lifeTarget);
  // END TARGET CODE

  group.add(upwardsTableGroup);

  tableDepth = config.mode === MODE.MULTIPLAYER ? config.tableDepth : config.tableDepth / 2;
  // lines
  // put the lines slightly above the table to combat z-fighting
  const epsilon = 0.001;
  const lineWidth = 0.03;
  const lineGroup = new Group();

  material = new MeshLambertMaterial({
    color: 0xFFFFFF,
    depthWrite: false,
  });
  geometry = new BoxGeometry(lineWidth, epsilon, tableDepth);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableHeight / 2 + epsilon;
  mesh.position.x = -config.tableWidth / 2 + lineWidth / 2;
  mesh.receiveShadow = true;
  lineGroup.add(mesh);

  geometry = new BoxGeometry(lineWidth, epsilon, tableDepth);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableHeight / 2 + epsilon;
  mesh.position.x = config.tableWidth / 2 - lineWidth / 2;
  mesh.receiveShadow = true;
  lineGroup.add(mesh);

  geometry = new BoxGeometry(config.tableWidth - lineWidth * 2, epsilon, lineWidth);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableHeight / 2 + epsilon;
  mesh.position.z = tableDepth / 2 - lineWidth / 2;
  mesh.receiveShadow = true;
  lineGroup.add(mesh);

  geometry = new BoxGeometry(config.tableWidth - lineWidth * 2, epsilon, lineWidth);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableHeight / 2 + epsilon;
  mesh.position.z = -tableDepth / 2 + lineWidth / 2;
  mesh.receiveShadow = true;
  lineGroup.add(mesh);

  geometry = new BoxGeometry(lineWidth, 0.001, tableDepth - lineWidth * 2);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableHeight / 2 + epsilon;
  mesh.receiveShadow = true;
  lineGroup.add(mesh);

  if (config.mode === MODE.SINGLEPLAYER) {
    lineGroup.position.z = config.tableDepth / 4;
  }

  group.add(lineGroup);

  // lines for the upwards tilted table
  material = new MeshLambertMaterial({
    color: 0xDDDDDD,
    depthWrite: false,
  });
  geometry = new BoxGeometry(config.tableWidth - lineWidth * 2, epsilon, lineWidth);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableThickness / 2 + epsilon;
  mesh.position.z = -upwardsTableHeight / 2 + lineWidth / 2;
  mesh.receiveShadow = true;
  upwardsTableGroup.add(mesh);

  geometry = new BoxGeometry(config.tableWidth - lineWidth * 2, epsilon, lineWidth);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableThickness / 2 + epsilon;
  mesh.position.z = upwardsTableHeight / 2 - lineWidth / 2;
  mesh.receiveShadow = true;
  upwardsTableGroup.add(mesh);

  geometry = new BoxGeometry(lineWidth, epsilon, upwardsTableHeight);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableThickness / 2 + epsilon;
  mesh.position.x = -config.tableWidth / 2 + lineWidth / 2;
  mesh.receiveShadow = true;
  upwardsTableGroup.add(mesh);

  geometry = new BoxGeometry(lineWidth, epsilon, upwardsTableHeight);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableThickness / 2 + epsilon;
  mesh.position.x = config.tableWidth / 2 - lineWidth / 2;
  mesh.receiveShadow = true;
  upwardsTableGroup.add(mesh);

  geometry = new BoxGeometry(lineWidth, 0.001, upwardsTableHeight - lineWidth);
  mesh = new Mesh(geometry, material);
  mesh.position.y = config.tableThickness / 2 + epsilon;
  mesh.position.z = lineWidth / 2;
  mesh.receiveShadow = true;
  upwardsTableGroup.add(mesh);

  parent.add(group);

  return group;
};
