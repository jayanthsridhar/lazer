export default function SetTransformToContext (transform, context, i = 1) {

    if (transform.dirty)
    {
        transform.updateTransform(i);
    }

    context.setTransform(
        transform.local[0],  // scale x
        transform.local[1],  // shear y
        transform.local[2],  // shear x
        transform.local[3],  // scale y
        transform.local[4],  // translate x
        transform.local[5]   // translate y
    );

}
