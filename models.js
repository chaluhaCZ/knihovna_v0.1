const T = window.THREE;

function mesh(parent, geometry, color, x, y, z) {
  const part = new T.Mesh(geometry, new T.MeshLambertMaterial({ color }));
  part.position.set(x, y, z);
  parent.add(part);
  return part;
}

function sphere(parent, color, x, y, z, sx, sy, sz) {
  const part = mesh(parent, new T.SphereGeometry(1, 16, 12), color, x, y, z);
  part.scale.set(sx, sy, sz);
  return part;
}

function eyes(parent, y, z, spacing) {
  for (const x of [-spacing, spacing]) {
    sphere(parent, '#fff8df', x, y, z, .074, .094, .052);
    sphere(parent, '#242a31', x + .012, y - .005, z + .043, .036, .049, .02);
  }
}

function octopus(color) {
  const root = new T.Group();
  const body = new T.Group();
  root.add(body);
  sphere(body, color, 0, .44, 0, .34, .37, .30);
  sphere(body, '#ffc3ba', 0, .31, .20, .21, .14, .13);
  eyes(body, .49, .267, .125);
  const arms = [];
  for (let armIndex = 0; armIndex < 8; armIndex++) {
    const angle = armIndex * Math.PI / 4;
    const segments = [];
    for (let segment = 0; segment < 8; segment++) {
      const radius = .118 - segment * .010;
      segments.push(sphere(root, segment % 2 ? '#c85885' : color, 0, 0, 0, radius, radius * .68, radius));
    }
    arms.push({ angle, segments });
  }
  return {
    root,
    pose(time, wave = 0, retract = 0) {
      body.position.y = .025 * Math.sin(time * 4);
      for (const { angle, segments } of arms) {
        segments.forEach((part, index) => {
          const tip = index / (segments.length - 1);
          const length = (.21 + .64 * tip) * (1 - .86 * retract);
          const bend = angle + .34 * tip * Math.sin(time * 4 - tip * 3 + angle);
          const lift = tip * (.04 + wave * .39) * (1 + Math.sin(time * 7 - tip * 4 + angle));
          part.position.set(Math.cos(bend) * length, .085 + lift, Math.sin(bend) * length);
          part.visible = retract < .997;
        });
      }
    },
  };
}

function fox(color) {
  const root = new T.Group();
  sphere(root, color, 0, .24, -.14, .23, .25, .37);
  sphere(root, color, 0, .49, .17, .29, .25, .23);
  sphere(root, '#ffe4bd', 0, .405, .315, .20, .117, .127);
  sphere(root, '#31292e', 0, .435, .427, .065, .045, .043);
  eyes(root, .52, .353, .105);
  for (const direction of [-1, 1]) {
    const ear = mesh(root, new T.ConeGeometry(.124, .29, 3), color, direction * .17, .70, .10);
    ear.rotation.z = -.24 * direction;
    for (const z of [-.31, .085]) {
      sphere(root, '#883c31', direction * .13, .094, z, .070, .115, .076);
    }
  }
  const tail = new T.Group();
  tail.position.set(0, .24, -.42);
  root.add(tail);
  sphere(tail, color, 0, .11, -.18, .131, .16, .27);
  sphere(tail, '#ffe4bd', 0, .16, -.35, .109, .13, .146);
  return { root, pose(time, wave = 0) { tail.rotation.y = (.22 + wave * .7) * Math.sin(time * 5); } };
}

export const models = { octopus, fox };
