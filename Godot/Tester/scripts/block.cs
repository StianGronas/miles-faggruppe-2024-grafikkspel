using Godot;
using System;

public partial class block : RigidBody3D
{
	// Called when the node enters the scene tree for the first time.
	public override void _Ready()
	{
	}

	// Called every frame. 'delta' is the elapsed time since the previous frame.
	public override void _Process(double delta)
	{
		var rotate = 0.8f * (float)delta;
		var child0 = this.GetChild<CollisionShape3D>(0);
		if (child0 is not null) {
			child0.RotateY(rotate);
		}
		var child1 = GetChild<MeshInstance3D>(1);
		if (child1 is not null) {
			child1.RotateY(rotate);
		}
	}
}
