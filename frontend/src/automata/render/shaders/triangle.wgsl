struct Frame {
  aspect: f32,
  time: f32,
}

@group(0) @binding(0) var<uniform> frame: Frame;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> VertexOut {
  var positions = array<vec2f, 3>(
    vec2f(0.0, 0.6),
    vec2f(-0.5196, -0.3),
    vec2f(0.5196, -0.3),
  );
  var colors = array<vec3f, 3>(
    vec3f(1.0, 0.2, 0.2),
    vec3f(0.2, 1.0, 0.2),
    vec3f(0.2, 0.4, 1.0),
  );

  let scale = select(
    vec2f(1.0, frame.aspect),
    vec2f(1.0 / frame.aspect, 1.0),
    frame.aspect >= 1.0,
  );

  var out: VertexOut;
  let c = cos(frame.time);
  let s = sin(frame.time);
  let p = positions[index];
  let rotated = vec2f(p.x * c - p.y * s, p.x * s + p.y * c);
  out.position = vec4f(rotated * scale, 0.0, 1.0);
  out.color = colors[index];
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
  return vec4f(in.color, 1.0);
}
