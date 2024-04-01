using Godot;
using System;
using System.Reflection.Metadata.Ecma335;

public partial class camera : Camera3D
{
	// Called when the node enters the scene tree for the first time.
	public override void _Ready()
	{
	}

	// Called every frame. 'delta' is the elapsed time since the previous frame.
	public override void _Process(double delta)
	{
		var speed = 8f;
		if (Input.IsKeyPressed(Key.W)) {
			this.Position += Vector3.Left * speed * (float)delta;
		}

		if (Input.IsKeyPressed(Key.S)) {
			this.Position += Vector3.Right * speed * (float)delta;
		}

		if (Input.IsKeyPressed(Key.A)) {
			this.Position += Vector3.Back * speed * (float)delta;
		}

		if (Input.IsKeyPressed(Key.D)) {
			this.Position += Vector3.Forward * speed * (float)delta;
		}
	}
}
