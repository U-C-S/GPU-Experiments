async fn run() {
    let instance = wgpu::Instance::default();
    let adapter = instance
        .request_adapter(&wgpu::RequestAdapterOptions::default())
        .await;

    let (device, queue) = adapter
        .unwrap()
        .request_device(
            &wgpu::DeviceDescriptor {
                features: wgpu::Features::empty(),
                label: None,
                limits: wgpu::Limits::downlevel_defaults(),
            },
            None,
        )
        .await
        .unwrap();

    let compute_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: None,
        source: wgpu::ShaderSource::Wgsl(std::borrow::Cow::Borrowed(include_str!(
            "something.wgsl"
        ))),
    });
}

fn main() {
    println!("Hello, world!");
}
