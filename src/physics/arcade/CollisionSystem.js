import PtrVec2 from 'physics/arcade/PtrVec2.js'
import {
    GetBodiesPositionX,
    GetBodiesPositionY,
    GetBodiesVelocityX,
    GetBodiesVelocityY,
    GetBodiesBounceX,
    GetBodiesBounceY,
    GetBodiesFrictionX,
    GetBodiesFrictionY,
    GetBodiesMass
}
from 'physics/arcade/PhysicsSystem.js'
import {
    CIRCLE_COLLIDER,
    POLYGON_COLLIDER
} from 'physics/arcade/Collider.js'
// Move to DOD style
import PolygonToCircleCorrection from 'sat/collision/PolygonToCircleCorrection.js'
import CorrectionData from 'sat/collision/CorrectionData.js'
import PolygonToPolygonCorrection from 'sat/collision/PolygonToPolygonCorrection.js'

const MAX_COLLIDERS = 100000;
const MAX_NUM = Number.MAX_VALUE;
const Abs = Math.abs;
const Sqrt = Math.sqrt;

// Polyong Collider Data.
let PColliderCount = 0;
let SystemPColliderDataX = new Float32Array(MAX_COLLIDERS);
let SystemPColliderDataY = new Float32Array(MAX_COLLIDERS);

// Circle Collider Data.
let CColliderCount = 0;
let SystemCColliderDataX = new Float32Array(MAX_COLLIDERS);
let SystemCColliderDataY = new Float32Array(MAX_COLLIDERS);
let SystemCColliderDataR = new Float32Array(MAX_COLLIDERS);

// Polygon to Polygon Dynamic-Dymamic Collision Request Data.
let SystemDPolyToDPolyCollisionReqSize = 0;
let SystemDPolyToDPolyCollisionReqA = new Uint16Array(MAX_COLLIDERS * 3);
let SystemDPolyToDPolyCollisionReqB = new Uint16Array(MAX_COLLIDERS * 3);

// Polygon to Polygon Static-Dymamic Collision Request Data.
let SystemSPolyToDPolyCollisionReqSize = 0;
let SystemSPolyToDPolyCollisionReqA = new Uint16Array(MAX_COLLIDERS * 3);
let SystemSPolyToDPolyCollisionReqB = new Uint16Array(MAX_COLLIDERS * 3);

// Circle to Circle Dynamic-Dymamic Collision Request Data.
let SystemDDCircleToCircleCollisionReqSize = 0;
let SystemDDCircleToCircleCollisionReqA = new Uint16Array(MAX_COLLIDERS * 2);
let SystemDDCircleToCircleCollisionReqB = new Uint16Array(MAX_COLLIDERS * 2);

// Circle to Circle Static-Dymamic Collision Request Data.
let SystemSDCircleToCircleCollisionReqSize = 0;
let SystemSDCircleToCircleCollisionReqA = new Uint16Array(MAX_COLLIDERS * 2);
let SystemSDCircleToCircleCollisionReqB = new Uint16Array(MAX_COLLIDERS * 2);

// Circle to Polygon Dynamic-Dymamic Collision Request Data.
let SystemDDCircleToPolygonCollisionReqSize = 0;
let SystemDDCircleToPolygonCollisionReqA = new Uint16Array(MAX_COLLIDERS * 3);
let SystemDDCircleToPolygonCollisionReqB = new Uint16Array(MAX_COLLIDERS * 3);

// Circle to Polygon Static-Dymamic Collision Request Data.
let SystemSDCircleToPolygonCollisionReqSize = 0;
let SystemSDCircleToPolygonCollisionReqA = new Uint16Array(MAX_COLLIDERS * 3);
let SystemSDCircleToPolygonCollisionReqB = new Uint16Array(MAX_COLLIDERS * 3);

// Polygon to Circle Static-Dymamic Collision Request Data.
let SystemSDPolygonToCircleCollisionReqSize = 0;
let SystemSDPolygonToCircleCollisionReqA = new Uint16Array(MAX_COLLIDERS * 3);
let SystemSDPolygonToCircleCollisionReqB = new Uint16Array(MAX_COLLIDERS * 3);

// Collision Callbacks Data.
let SystemCollisionValidCallbackSize = 0;
let SystemCollisionRequestCallbackSize = 0;
let SystemCollisionRequestCallback = new Array(MAX_COLLIDERS);
let SystemCollisionValidCallback = new Array(MAX_COLLIDERS);

// Pools
let NormalsPoolX = new Float32Array(MAX_COLLIDERS);
let NormalsPoolY = new Float32Array(MAX_COLLIDERS);
let NormalsPoolUsed = 0;
let ProjectionA = new Float32Array(2);
let ProjectionB = new Float32Array(2);
let Correction = new Float32Array(2);
let UnitVector = new Float32Array(2);

export function RegisterCircleCollider(collider, x, y, radius) {
    collider.ptrX = SystemCColliderDataX.subarray(CColliderCount, CColliderCount + 1);
    collider.ptrY = SystemCColliderDataY.subarray(CColliderCount, CColliderCount + 1);
    collider.ptrR = SystemCColliderDataR.subarray(CColliderCount, CColliderCount + 1);
    collider.ptrX[0] = x;
    collider.ptrY[0] = y;
    collider.ptrR[0] = radius;
    collider.ID = CColliderCount++;
    return collider;
}

export function RegisterPolygonCollider(collider, vertices) {
    let length = vertices.length;
    let index = 0;

    if (PColliderCount + length > MAX_COLLIDERS) {
        return null;
    }
    collider.verticesX = SystemPColliderDataX.subarray(PColliderCount, PColliderCount + length);
    collider.verticesY = SystemPColliderDataY.subarray(PColliderCount, PColliderCount + length);
    for (; index < length; ++index) {
        collider.verticesX[index] = vertices[index][0];
        collider.verticesY[index] = vertices[index][1];
    }
    collider.ID = PColliderCount;
    PColliderCount += length;
    return collider;
}

function CollidePolyonToPolygon(bodyA, bodyB) {
    if (!bodyA.immovable && !bodyB.immovable) {
        SystemDPolyToDPolyCollisionReqA[SystemDPolyToDPolyCollisionReqSize] = bodyA.ID;
        SystemDPolyToDPolyCollisionReqA[SystemDPolyToDPolyCollisionReqSize + 1] = bodyA.collider.ID;
        SystemDPolyToDPolyCollisionReqA[SystemDPolyToDPolyCollisionReqSize + 2] = bodyA.collider.verticesX.length;
        SystemDPolyToDPolyCollisionReqB[SystemDPolyToDPolyCollisionReqSize] = bodyB.ID;
        SystemDPolyToDPolyCollisionReqB[SystemDPolyToDPolyCollisionReqSize + 1] = bodyB.collider.ID;
        SystemDPolyToDPolyCollisionReqB[SystemDPolyToDPolyCollisionReqSize + 2] = bodyB.collider.verticesX.length;
        SystemDPolyToDPolyCollisionReqSize += 3;
    } else if (bodyA.immovable && !bodyB.immovable) {
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize] = bodyA.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 1] = bodyA.collider.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 2] = bodyA.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize] = bodyB.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 1] = bodyB.collider.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 2] = bodyB.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqSize += 3;
    } else if (!bodyA.immovable && bodyB.immovable) {
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize] = bodyB.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 1] = bodyB.collider.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 2] = bodyB.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize] = bodyA.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 1] = bodyA.collider.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 2] = bodyA.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqSize += 3;
    } else {
        return false;
    }
    return true;
}

function CollideCircleToCircle(bodyA, bodyB) {
    if (!bodyA.immovable && !bodyB.immovable) {
        SystemDDCircleToCircleCollisionReqA[SystemDDCircleToCircleCollisionReqSize] = bodyA.ID;
        SystemDDCircleToCircleCollisionReqA[SystemDDCircleToCircleCollisionReqSize + 1] = bodyA.collider.ID;

        SystemDDCircleToCircleCollisionReqB[SystemDDCircleToCircleCollisionReqSize] = bodyB.ID;
        SystemDDCircleToCircleCollisionReqB[SystemDDCircleToCircleCollisionReqSize + 1] = bodyB.collider.ID;
        SystemDDCircleToCircleCollisionReqSize += 2;
    } else if (bodyA.immovable && !bodyB.immovable) {
        SystemSDCircleToCircleCollisionReqA[SystemSDCircleToCircleCollisionReqSize] = bodyA.ID;
        SystemSDCircleToCircleCollisionReqA[SystemSDCircleToCircleCollisionReqSize + 1] = bodyA.collider.ID;

        SystemSDCircleToCircleCollisionReqB[SystemSDCircleToCircleCollisionReqSize] = bodyB.ID;
        SystemSDCircleToCircleCollisionReqB[SystemSDCircleToCircleCollisionReqSize + 1] = bodyB.collider.ID;
        SystemSDCircleToCircleCollisionReqSize += 2;
    } else if (!bodyA.immovable && bodyB.immovable) {
        SystemSDCircleToCircleCollisionReqA[SystemSDCircleToCircleCollisionReqSize] = bodyB.ID;
        SystemSDCircleToCircleCollisionReqA[SystemSDCircleToCircleCollisionReqSize + 1] = bodyB.collider.ID;

        SystemSDCircleToCircleCollisionReqB[SystemSDCircleToCircleCollisionReqSize] = bodyA.ID;
        SystemSDCircleToCircleCollisionReqB[SystemSDCircleToCircleCollisionReqSize + 1] = bodyA.collider.ID;
        SystemSDCircleToCircleCollisionReqSize += 2;
    } else {
        return false;
    }
    return true;
}

function CollideCircleToPolygon(bodyA, bodyB) {
    /*if (!bodyA.immovable && !bodyB.immovable) {
        SystemDDCircleToPolygonCollisionReqA[SystemDPolyToDPolyCollisionReqSize] = bodyA.ID;
        SystemDDCircleToPolygonCollisionReqA[SystemDPolyToDPolyCollisionReqSize + 1] = bodyA.collider.ID;
        SystemDDCircleToPolygonCollisionReqA[SystemDPolyToDPolyCollisionReqSize + 2] = 0;
        SystemDDCircleToPolygonCollisionReqB[SystemDPolyToDPolyCollisionReqSize] = bodyB.ID;
        SystemDDCircleToPolygonCollisionReqB[SystemDPolyToDPolyCollisionReqSize + 1] = bodyB.collider.ID;
        SystemDDCircleToPolygonCollisionReqB[SystemDPolyToDPolyCollisionReqSize + 2] = bodyB.collider.verticesX.length;
        SystemDDCircleToPolygonCollisionReqSize += 3;
    }/* else if (bodyA.immovable && !bodyB.immovable) {
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize] = bodyA.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 1] = bodyA.collider.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 2] = bodyA.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize] = bodyB.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 1] = bodyB.collider.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 2] = bodyB.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqSize += 3;
    } else if (!bodyA.immovable && bodyB.immovable) {
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize] = bodyB.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 1] = bodyB.collider.ID;
        SystemSPolyToDPolyCollisionReqA[SystemSPolyToDPolyCollisionReqSize + 2] = bodyB.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize] = bodyA.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 1] = bodyA.collider.ID;
        SystemSPolyToDPolyCollisionReqB[SystemSPolyToDPolyCollisionReqSize + 2] = bodyA.collider.verticesX.length;
        SystemSPolyToDPolyCollisionReqSize += 3;
    } else {
        return false;
    }
    return true;*/
}

function CollidePolygonToCircle(bodyA, bodyB) {
    let circleBody = bodyA.collider.colliderType === CIRCLE_COLLIDER ? bodyA : bodyB;
    let polygonBody = bodyA.collider.colliderType === POLYGON_COLLIDER ? bodyA : bodyB;
    let correctionData = new CorrectionData();
    let globalPositionX = GetBodiesPositionX();
    let globalPositionY = GetBodiesPositionY();
    let globalVelocityX = GetBodiesVelocityX();
    let globalVelocityY = GetBodiesVelocityY();
    let globalBounceX = GetBodiesBounceX();
    let globalBounceY = GetBodiesBounceY();
    let globalFrictionX = GetBodiesFrictionX();
    let globalFrictionY = GetBodiesFrictionY();
    let globalMass = GetBodiesMass();
    let length = polygonBody.collider.vertexCount;
    let index = 0;
    let vertices = new Array(length);
    let bodyID = polygonBody.ID;
    let polyID = polygonBody.collider.ID;
    for (; index < length; ++index) {
        vertices[index] = [
            polygonBody.position.x + polygonBody.collider.getX(index),
            polygonBody.position.y + polygonBody.collider.getY(index)
        ];
    }
    if (PolygonToCircleCorrection(
            vertices, [
                circleBody.position.x + circleBody.collider.x,
                circleBody.position.y + circleBody.collider.y
            ],
            circleBody.collider.radius,
            correctionData
        )) {
        let aID = circleBody.ID;
        let bID = polygonBody.ID;

        let ux = correctionData.unit[0];
        let uy = correctionData.unit[1];
        let dot, dx, dy;
        //polygon
        if (!polygonBody.immovable) {
            polygonBody.position.x += correctionData.correction[0];
            polygonBody.position.y += correctionData.correction[1];
            if (circleBody.immovable) {
                if (correctionData.correction[0] < correctionData.correction[1]) {
                    globalPositionX[bID] += correctionData.correction[0];
                    globalVelocityX[bID] = globalVelocityX[aID] - globalVelocityX[bID] * globalBounceX[bID];
                } else {
                    globalPositionY[bID] += correctionData.correction[1];
                    globalVelocityY[bID] = globalVelocityY[aID] - globalVelocityY[bID] * globalBounceY[bID];
                }
            } else {
                let nv1 = ((globalVelocityX[bID] * globalVelocityX[aID] * globalMass[bID]) / globalMass[aID]) * 1000;
                // Get abs value
                nv1 = ((nv1 ^ (nv1 >> 31)) - (nv1 >> 31)) / 1000;
                nv1 = Sqrt(nv1);
                // Multiply by sign
                nv1 *= (~((globalVelocityX[bID] >> 31) & 1) + 1) | (((~globalVelocityX[bID] + 1) >> 31) & 1);
                let nv2 = ((globalVelocityX[aID] * globalVelocityX[bID] * globalMass[aID]) / globalMass[bID]) * 1000;
                // Get abs value
                nv2 = ((nv2 ^ (nv2 >> 31)) - (nv2 >> 31)) / 1000;
                nv2 = Sqrt(nv2);
                // Multiply by sign
                nv2 *= (~((globalVelocityX[aID] >> 31) & 1) + 1) | (((~globalVelocityX[aID] + 1) >> 31) & 1);
                let avg = (nv1 + nv2) * 0.5;
                nv1 -= avg;
                nv2 -= avg;
                globalVelocityX[bID] = avg + nv2 * globalBounceX[bID];
                nv1 = ((globalVelocityY[bID] * globalVelocityY[aID] * globalMass[bID]) / globalMass[aID]) * 1000;
                // Get abs value
                nv1 = ((nv1 ^ (nv1 >> 31)) - (nv1 >> 31)) / 1000;
                nv1 = Sqrt(nv1);
                // Multiply by sign
                nv1 *= (~((globalVelocityY[bID] >> 31) & 1) + 1) | (((~globalVelocityY[bID] + 1) >> 31) & 1);
                nv2 = ((globalVelocityY[aID] * globalVelocityY[bID] * globalMass[aID]) / globalMass[bID]) * 1000;
                // Get abs value
                nv2 = ((nv2 ^ (nv2 >> 31)) - (nv2 >> 31)) / 1000;
                nv2 = Sqrt(nv2);
                // Multiply by sign
                nv2 *= (~((globalVelocityY[aID] >> 31) & 1) + 1) | (((~globalVelocityY[aID] + 1) >> 31) & 1);
                avg = (nv1 + nv2) * 0.5;
                nv1 -= avg;
                nv2 -= avg;
                globalVelocityY[bID] = avg + nv2 * globalBounceY[bID];
            }
        }
        // Circle
        if (!circleBody.immovable) {
            circleBody.position.x -= correctionData.correction[0];
            circleBody.position.y -= correctionData.correction[1];

            if (polygonBody.immovable) {
                dot = globalVelocityX[aID] * ux + globalVelocityY[aID] * uy;
                ux *= dot;
                uy *= dot;

                dx = globalVelocityX[aID] - ux - ux;
                dy = globalVelocityY[aID] - uy - uy;
                dx -= globalVelocityX[aID] * globalBounceX[aID];
                dy = globalVelocityY[aID] * globalBounceY[aID];

                globalVelocityX[aID] = dx;
                globalVelocityY[aID] = dy;
            } else {
                dot = globalVelocityX[aID] * ux + globalVelocityY[aID] * uy;
                ux *= dot;
                uy *= dot;

                dx = globalVelocityX[aID] - ux - ux;
                dy = globalVelocityY[aID] - uy - uy;
                dx -= globalVelocityX[aID] * globalBounceX[aID];
                dy -= globalVelocityY[aID] * globalBounceY[aID];

                globalVelocityX[aID] += dx;
                globalVelocityY[aID] += dy;
            }
        }

        SystemCollisionValidCallback[SystemCollisionValidCallbackSize++] = SystemCollisionRequestCallback[SystemCollisionRequestCallbackSize];
    }

}

export function Collide(bodyA, bodyB, callback) {
    let colliderTypeA = bodyA.collider.colliderType;
    let colliderTypeB = bodyB.collider.colliderType;

    if (colliderTypeA === POLYGON_COLLIDER &&
        colliderTypeB === POLYGON_COLLIDER) {
        CollidePolyonToPolygon(bodyA, bodyB);
        SystemCollisionRequestCallback[SystemCollisionRequestCallbackSize++] = callback;
    } else if (colliderTypeA === CIRCLE_COLLIDER &&
        colliderTypeB === CIRCLE_COLLIDER) {
        CollideCircleToCircle(bodyA, bodyB);
        SystemCollisionRequestCallback[SystemCollisionRequestCallbackSize++] = callback;
    } else if (colliderTypeA === CIRCLE_COLLIDER &&
        colliderTypeB === POLYGON_COLLIDER) {
        CollidePolygonToCircle(bodyA, bodyB);
        SystemCollisionRequestCallback[SystemCollisionRequestCallbackSize++] = callback;
    } else if (colliderTypeA === POLYGON_COLLIDER &&
        colliderTypeB === CIRCLE_COLLIDER) {
        CollidePolygonToCircle(bodyB, bodyA);
        SystemCollisionRequestCallback[SystemCollisionRequestCallbackSize++] = callback;
    }
}

function SolveStaticCircleToDynamicCircleCollision(
    globalPositionX,
    globalPositionY,
    globalVelocityX,
    globalVelocityY,
    globalBounceX,
    globalBounceY,
    globalFrictionX,
    globalFrictionY,
    globalMass) {
    let index = 0;
    let length = SystemSDCircleToCircleCollisionReqSize;
    let aColliderID = 0;
    let bColliderID = 0;
    let aID = 0;
    let bID = 0;
    let dot = 0.0;
    let dx = 0.0;
    let dy = 0.0;
    let ux = 0.0;
    let uy = 0.0;
    let nv1 = 0.0;
    let nv2 = 0.0;
    let avg = 0.0;

    for (; index < length; index += 2) {
        aID = SystemSDCircleToCircleCollisionReqA[index];
        aColliderID = SystemSDCircleToCircleCollisionReqA[index + 1];
        bID = SystemSDCircleToCircleCollisionReqB[index];
        bColliderID = SystemSDCircleToCircleCollisionReqB[index + 1];

        if (DODCircleToCircleCorrection(
                aID,
                aColliderID,
                bID,
                bColliderID,
                globalPositionX,
                globalPositionY)) {

            globalPositionX[bID] -= Correction[0];
            globalPositionY[bID] -= Correction[1];

            ux = UnitVector[0];
            uy = UnitVector[1];

            dot = globalVelocityX[bID] * ux + globalVelocityY[bID] * uy;
            ux *= dot;
            uy *= dot;

            dx = globalVelocityX[bID] - ux - ux;
            dy = globalVelocityY[bID] - uy - uy;
            dx -= globalVelocityX[bID] * globalBounceX[bID];
            dy -= globalVelocityY[bID] * globalBounceY[bID];

            globalVelocityX[bID] += dx;
            globalVelocityY[bID] += dy;

            Correction[0] = 0;
            Correction[1] = 0;
            UnitVector[0] = 0;
            UnitVector[1] = 0;
            // Pass the callback
            SystemCollisionValidCallback[SystemCollisionValidCallbackSize++] = SystemCollisionRequestCallback[(index / 3) | 0];
        }
    }
    SystemSDCircleToCircleCollisionReqSize = 0;
}

function SolveDynamicCircleToDynamicCircleCollision(
    globalPositionX,
    globalPositionY,
    globalVelocityX,
    globalVelocityY,
    globalBounceX,
    globalBounceY,
    globalFrictionX,
    globalFrictionY,
    globalMass) {
    let index = 0;
    let length = SystemDDCircleToCircleCollisionReqSize;
    let aColliderID = 0;
    let bColliderID = 0;
    let aID = 0;
    let bID = 0;
    let dot = 0.0;
    let dx = 0.0;
    let dy = 0.0;
    let ux = 0.0;
    let uy = 0.0;

    for (; index < length; index += 2) {
        aID = SystemDDCircleToCircleCollisionReqA[index];
        aColliderID = SystemDDCircleToCircleCollisionReqA[index + 1];
        bID = SystemDDCircleToCircleCollisionReqB[index];
        bColliderID = SystemDDCircleToCircleCollisionReqB[index + 1];

        if (DODCircleToCircleCorrection(
                aID,
                aColliderID,
                bID,
                bColliderID,
                globalPositionX,
                globalPositionY)) {

            globalPositionX[aID] += Correction[0];
            globalPositionX[bID] -= Correction[0];
            globalPositionY[aID] += Correction[1];
            globalPositionY[bID] -= Correction[1];

            ux = UnitVector[0];
            uy = UnitVector[1];

            dot = globalVelocityX[aID] * ux + globalVelocityY[aID] * uy;

            ux *= dot;
            uy *= dot;

            dx = globalVelocityX[aID] - ux;
            dy = globalVelocityY[aID] - uy;
            dx -= ux;
            dy -= uy;
            dx -= globalVelocityX[aID] * globalBounceX[aID];
            dy -= globalVelocityY[aID] * globalBounceY[aID];

            globalVelocityX[aID] += dx;
            globalVelocityY[aID] += dy;

            ux = UnitVector[0];
            uy = UnitVector[1];

            dot = globalVelocityX[bID] * ux + globalVelocityY[bID] * uy;
            ux *= dot;
            uy *= dot;

            dx = globalVelocityX[bID] - ux;
            dy = globalVelocityY[bID] - uy;
            dx -= ux;
            dy -= uy;
            dx -= globalVelocityX[bID] * globalBounceX[bID];
            dy -= globalVelocityY[bID] * globalBounceY[bID];

            globalVelocityX[bID] += dx;
            globalVelocityY[bID] += dy;

            Correction[0] = 0;
            Correction[1] = 0;
            UnitVector[0] = 0;
            UnitVector[1] = 0;
            // Pass the callback
            SystemCollisionValidCallback[SystemCollisionValidCallbackSize++] = SystemCollisionRequestCallback[(index / 3) | 0];
        }
    }
    SystemDDCircleToCircleCollisionReqSize = 0;
}

function SolveDynamicPolygonToDynamicPolygonCollision(
    globalPositionX,
    globalPositionY,
    globalVelocityX,
    globalVelocityY,
    globalBounceX,
    globalBounceY,
    globalFrictionX,
    globalFrictionY,
    globalMass) {
    let index = 0;
    let length = SystemDPolyToDPolyCollisionReqSize;
    let startA = 0;
    let startB = 0;
    let aID = 0;
    let bID = 0;
    let nv1 = 0.0;
    let nv2 = 0.0;
    let avg = 0.0;

    for (; index < length; index += 3) {
        startA = SystemDPolyToDPolyCollisionReqA[index + 1];
        startB = SystemDPolyToDPolyCollisionReqB[index + 1];
        aID = SystemDPolyToDPolyCollisionReqA[index];
        bID = SystemDPolyToDPolyCollisionReqB[index];

        if (DODPolygonToPolygonCorrection(
                aID,
                startA,
                SystemDPolyToDPolyCollisionReqA[index + 2],
                bID,
                startB,
                SystemDPolyToDPolyCollisionReqB[index + 2],
                globalPositionX,
                globalPositionY)) {
            globalPositionX[aID] -= Correction[0];
            globalPositionX[bID] += Correction[0];
            globalPositionY[aID] -= Correction[1];
            globalPositionY[bID] += Correction[1];
            nv1 = ((globalVelocityX[bID] * globalVelocityX[aID] * globalMass[bID]) / globalMass[aID]) * 1000;
            // Get abs value
            nv1 = ((nv1 ^ (nv1 >> 31)) - (nv1 >> 31)) / 1000;
            nv1 = Sqrt(nv1);
            // Multiply by sign
            nv1 *= (~((globalVelocityX[bID] >> 31) & 1) + 1) | (((~globalVelocityX[bID] + 1) >> 31) & 1);
            nv2 = ((globalVelocityX[aID] * globalVelocityX[bID] * globalMass[aID]) / globalMass[bID]) * 1000;
            // Get abs value
            nv2 = ((nv2 ^ (nv2 >> 31)) - (nv2 >> 31)) / 1000;
            nv2 = Sqrt(nv2);
            // Multiply by sign
            nv2 *= (~((globalVelocityX[aID] >> 31) & 1) + 1) | (((~globalVelocityX[aID] + 1) >> 31) & 1);
            avg = (nv1 + nv2) * 0.5;
            nv1 -= avg;
            nv2 -= avg;
            globalVelocityX[aID] = avg + nv1 * globalBounceX[aID];
            globalVelocityX[bID] = avg + nv2 * globalBounceX[bID];
            nv1 = ((globalVelocityY[bID] * globalVelocityY[aID] * globalMass[bID]) / globalMass[aID]) * 1000;
            // Get abs value
            nv1 = ((nv1 ^ (nv1 >> 31)) - (nv1 >> 31)) / 1000;
            nv1 = Sqrt(nv1);
            // Multiply by sign
            nv1 *= (~((globalVelocityY[bID] >> 31) & 1) + 1) | (((~globalVelocityY[bID] + 1) >> 31) & 1);
            nv2 = ((globalVelocityY[aID] * globalVelocityY[bID] * globalMass[aID]) / globalMass[bID]) * 1000;
            // Get abs value
            nv2 = ((nv2 ^ (nv2 >> 31)) - (nv2 >> 31)) / 1000;
            nv2 = Sqrt(nv2);
            // Multiply by sign
            nv2 *= (~((globalVelocityY[aID] >> 31) & 1) + 1) | (((~globalVelocityY[aID] + 1) >> 31) & 1);
            avg = (nv1 + nv2) * 0.5;
            nv1 -= avg;
            nv2 -= avg;
            globalVelocityY[aID] = avg + nv1 * globalBounceY[aID];
            globalVelocityY[bID] = avg + nv2 * globalBounceY[bID];
            Correction[0] = 0;
            Correction[1] = 0;
            // Pass the callback
            SystemCollisionValidCallback[SystemCollisionValidCallbackSize++] = SystemCollisionRequestCallback[(index / 3) | 0];
        }
    }
    SystemDPolyToDPolyCollisionReqSize = 0;
}

function SolveStaticPolygonToDynamicPolygonCollision(
    globalPositionX,
    globalPositionY,
    globalVelocityX,
    globalVelocityY,
    globalBounceX,
    globalBounceY,
    globalFrictionX,
    globalFrictionY,
    globalMass) {
    let index = 0;
    let length = SystemSPolyToDPolyCollisionReqSize;
    let aColliderID = 0;
    let bColliderID = 0;
    let aID = 0;
    let bID = 0;
    let lengthA = 0;
    let lengthB = 0;

    var correctionData = new CorrectionData();
    for (; index < length; index += 3) {
        aColliderID = SystemSPolyToDPolyCollisionReqA[index + 1];
        bColliderID = SystemSPolyToDPolyCollisionReqB[index + 1];
        aID = SystemSPolyToDPolyCollisionReqA[index];
        bID = SystemSPolyToDPolyCollisionReqB[index];
        lengthA = SystemSPolyToDPolyCollisionReqA[index + 2];
        lengthB = SystemSPolyToDPolyCollisionReqB[index + 2];
        var v0 = new Array(lengthA);
        var v1 = new Array(lengthB);

        for (var i = 0; i < lengthA; ++i) {
            v0[i] = [
                globalPositionX[aID] + SystemPColliderDataX[aColliderID + i],
                globalPositionY[aID] + SystemPColliderDataY[aColliderID + i]
            ];
        }
        for (var i = 0; i < lengthB; ++i) {
            v1[i] = [
                globalPositionX[bID] + SystemPColliderDataX[bColliderID + i],
                globalPositionY[bID] + SystemPColliderDataY[bColliderID + i]
            ];
        }
        if (PolygonToPolygonCorrection(v0, v1, correctionData)) {
            globalPositionX[bID] += correctionData.correction[0]
            globalPositionY[bID] += correctionData.correction[1]
            if (Abs(correctionData.unit[0]) > Abs(correctionData.unit[1])) {
                globalVelocityX[bID] = globalVelocityX[aID] - globalVelocityX[bID] * globalBounceX[bID];
            } else {
                globalVelocityY[bID] = globalVelocityY[aID] - globalVelocityY[bID] * globalBounceY[bID];
            }
        }

        /*if (DODPolygonToPolygonCorrection(
                aID,
                startA,
                SystemSPolyToDPolyCollisionReqA[index + 2],
                bID,
                startB,
                SystemSPolyToDPolyCollisionReqB[index + 2],
                globalPositionX,
                globalPositionY)) {

            if (Abs(Correction[0]) > Abs(Correction[1])) {
                globalPositionX[bID] += Correction[0];
            } else {
                globalPositionY[bID] += Correction[1];
            }*/
        /*nv1 = ((globalVelocityX[bID] * globalVelocityX[aID] * globalMass[bID]) / globalMass[aID]) * 1000;
        // Get abs value
        nv1 = ((nv1 ^ (nv1 >> 31)) - (nv1 >> 31)) / 1000;
        nv1 = Sqrt(nv1);
        // Multiply by sign
        nv1 *= (~((globalVelocityX[bID] >> 31) & 1) + 1) | (((~globalVelocityX[bID] + 1) >> 31) & 1);
        nv2 = ((globalVelocityX[aID] * globalVelocityX[bID] * globalMass[aID]) / globalMass[bID]) * 1000;
        // Get abs value
        nv2 = ((nv2 ^ (nv2 >> 31)) - (nv2 >> 31)) / 1000;
        nv2 = Sqrt(nv2);
        // Multiply by sign
        nv2 *= (~((globalVelocityX[aID] >> 31) & 1) + 1) | (((~globalVelocityX[aID] + 1) >> 31) & 1);
        avg = (nv1 + nv2) * 0.5;
        nv1 -= avg;
        nv2 -= avg;
        globalVelocityX[bID] = avg + nv2 * globalBounceX[bID];
        nv1 = ((globalVelocityY[bID] * globalVelocityY[aID] * globalMass[bID]) / globalMass[aID]) * 1000;
        // Get abs value
        nv1 = ((nv1 ^ (nv1 >> 31)) - (nv1 >> 31)) / 1000;
        nv1 = Sqrt(nv1);
        // Multiply by sign
        nv1 *= (~((globalVelocityY[bID] >> 31) & 1) + 1) | (((~globalVelocityY[bID] + 1) >> 31) & 1);
        nv2 = ((globalVelocityY[aID] * globalVelocityY[bID] * globalMass[aID]) / globalMass[bID]) * 1000;
        // Get abs value
        nv2 = ((nv2 ^ (nv2 >> 31)) - (nv2 >> 31)) / 1000;
        nv2 = Sqrt(nv2);
        // Multiply by sign
        nv2 *= (~((globalVelocityY[aID] >> 31) & 1) + 1) | (((~globalVelocityY[aID] + 1) >> 31) & 1);
        avg = (nv1 + nv2) * 0.5;
        nv1 -= avg;
        nv2 -= avg;
        globalVelocityY[bID] = avg + nv2 * globalBounceY[bID];*/
        //Correction[0] = 0;
        //Correction[1] = 0;
        // Pass the callback
        //SystemCollisionValidCallback[SystemCollisionValidCallbackSize++] = SystemCollisionRequestCallback[(index / 3) | 0];
        //}
    }
    SystemSPolyToDPolyCollisionReqSize = 0;
}

export function RunCollisionFrame() {
    let globalPositionX = GetBodiesPositionX();
    let globalPositionY = GetBodiesPositionY();
    let globalVelocityX = GetBodiesVelocityX();
    let globalVelocityY = GetBodiesVelocityY();
    let globalBounceX = GetBodiesBounceX();
    let globalBounceY = GetBodiesBounceY();
    let globalFrictionX = GetBodiesFrictionX();
    let globalFrictionY = GetBodiesFrictionY();
    let globalMass = GetBodiesMass();

    SolveDynamicPolygonToDynamicPolygonCollision(
        globalPositionX,
        globalPositionY,
        globalVelocityX,
        globalVelocityY,
        globalBounceX,
        globalBounceY,
        globalFrictionX,
        globalFrictionY,
        globalMass
    );
    SolveStaticPolygonToDynamicPolygonCollision(
        globalPositionX,
        globalPositionY,
        globalVelocityX,
        globalVelocityY,
        globalBounceX,
        globalBounceY,
        globalFrictionX,
        globalFrictionY,
        globalMass
    );
    SolveDynamicCircleToDynamicCircleCollision(
        globalPositionX,
        globalPositionY,
        globalVelocityX,
        globalVelocityY,
        globalBounceX,
        globalBounceY,
        globalFrictionX,
        globalFrictionY,
        globalMass
    );
    SolveStaticCircleToDynamicCircleCollision(
        globalPositionX,
        globalPositionY,
        globalVelocityX,
        globalVelocityY,
        globalBounceX,
        globalBounceY,
        globalFrictionX,
        globalFrictionY,
        globalMass
    );
    SystemCollisionRequestCallbackSize = 0;
}

export function EmitCollisionCallbacks() {
    let length = SystemCollisionValidCallbackSize,
        index = 0;

    for (; index < length; ++index) {
        if (SystemCollisionValidCallback[index])
            SystemCollisionValidCallback[index]();
    }
    SystemCollisionValidCallbackSize = 0;
}

// Init SystemCollisionQueueData
for (let index = 0; index < SystemDPolyToDPolyCollisionReqA.length; ++index) {
    SystemDPolyToDPolyCollisionReqA[index] = 0;
    SystemDPolyToDPolyCollisionReqB[index] = 0;
}

// DOD SAT version
function DODCircleToCircleCorrection(aID, aColliderID, bID, bColliderID, globalPositionX, globalPositionY) {
    let aPositionX = globalPositionX[aID] + SystemCColliderDataX[aColliderID];
    let bPositionX = globalPositionX[bID] + SystemCColliderDataX[bColliderID];
    let aPositionY = globalPositionY[aID] + SystemCColliderDataY[aColliderID];
    let bPositionY = globalPositionY[bID] + SystemCColliderDataY[bColliderID];
    let aRadius = SystemCColliderDataR[aColliderID];
    let bRadius = SystemCColliderDataR[bColliderID];
    let unitVectorX = aPositionX - bPositionX;
    let unitVectorY = aPositionY - bPositionY;
    let norm = unitVectorX * unitVectorX + unitVectorY * unitVectorY;
    let distance = Sqrt(norm);
    let mixRadius = aRadius + bRadius;
    let overlapFactor = mixRadius - distance;
    if (distance > mixRadius) {
        return false;
    }
    if (norm > 0) {
        norm = 1 / distance;
        unitVectorX *= norm;
        unitVectorY *= norm;
    }
    Correction[0] = unitVectorX * overlapFactor;
    Correction[1] = unitVectorY * overlapFactor;
    UnitVector[0] = unitVectorX;
    UnitVector[1] = unitVectorY;
    return true;
}

function DODPolygonToPolygonCorrection(aID, fromA, lengthA, bID, fromB, lengthB, globalPositionX, globalPositionY) {
    let axesAIndex = DODGetNormalizedPolygonAxes(aID, fromA, lengthA, globalPositionX, globalPositionY);
    let axesBIndex = DODGetNormalizedPolygonAxes(bID, fromB, lengthB, globalPositionX, globalPositionY);
    let unitVectorX = 0;
    let unitVectorY = 0;
    let index = 0;
    let axisX = 0.0;
    let axisY = 0.0;
    let distance = 0.0;
    let projectionDistanceA = 0.0;
    let projectionDistanceB = 0.0;
    let absoluteDistance = 0.0;
    let correctionOverlap = MAX_NUM;


    for (; index < lengthA; ++index) {
        distance = 0.0;
        absoluteDistance = 0.0;
        axisX = NormalsPoolX[axesAIndex + index];
        axisY = NormalsPoolY[axesAIndex + index];
        DODGetProjectionRange(aID, fromA, lengthA, axisX, axisY, ProjectionA, globalPositionX, globalPositionY);
        DODGetProjectionRange(bID, fromB, lengthB, axisX, axisY, ProjectionB, globalPositionX, globalPositionY);

        if (ProjectionA[0] > ProjectionB[1] || ProjectionB[0] > ProjectionA[1]) {
            NormalsPoolUsed = 0;
            return false;
        }

        if (ProjectionA[0] < ProjectionB[0] &&
            ProjectionA[1] < ProjectionB[1]) {
            distance = ProjectionA[1] - ProjectionB[0];
        } else if (ProjectionA[1] > ProjectionB[1]) {
            distance = ProjectionA[0] - ProjectionB[1];
        } else {
            projectionDistanceA = ProjectionA[1] - ProjectionB[0];
            projectionDistanceB = ProjectionB[1] - ProjectionA[0];
            if (projectionDistanceA < projectionDistanceB) {
                distance = projectionDistanceA;
            } else {
                distance = -projectionDistanceB;
            }
        }
        absoluteDistance = Abs(distance);
        if (absoluteDistance < correctionOverlap) {
            correctionOverlap = absoluteDistance;
            unitVectorX = axisX;
            unitVectorY = axisY;
            if (distance < 0) {
                unitVectorX = -unitVectorY;
                unitVectorY = -unitVectorY;
            }
        }
    }

    for (index = 0; index < lengthB; ++index) {
        distance = 0.0;
        absoluteDistance = 0.0;
        axisX = NormalsPoolX[axesBIndex + index];
        axisY = NormalsPoolY[axesBIndex + index];
        DODGetProjectionRange(aID, fromA, lengthA, axisX, axisY, ProjectionA, globalPositionX, globalPositionY);
        DODGetProjectionRange(bID, fromB, lengthB, axisX, axisY, ProjectionB, globalPositionX, globalPositionY);

        if (ProjectionA[0] > ProjectionB[1] || ProjectionB[0] > ProjectionA[1]) {
            NormalsPoolUsed = 0;
            return false;
        }

        if (ProjectionA[0] < ProjectionB[0] &&
            ProjectionA[1] < ProjectionB[1]) {
            distance = ProjectionA[1] - ProjectionB[0];
        } else if (ProjectionA[1] > ProjectionB[1]) {
            distance = ProjectionA[0] - ProjectionB[1];
        } else {
            projectionDistanceA = ProjectionA[1] - ProjectionB[0];
            projectionDistanceB = ProjectionB[1] - ProjectionA[0];
            if (projectionDistanceA < projectionDistanceB) {
                distance = projectionDistanceA;
            } else {
                distance = -projectionDistanceB;
            }
        }
        absoluteDistance = Abs(distance);
        if (absoluteDistance < correctionOverlap) {
            correctionOverlap = absoluteDistance;
            unitVectorX = axisX;
            unitVectorY = axisY;
            if (distance < 0) {
                unitVectorX = -unitVectorY;
                unitVectorY = -unitVectorY;
            }
        }
    }
    Correction[0] = unitVectorX * correctionOverlap;
    Correction[1] = unitVectorY * correctionOverlap;
    return true;
}

/*}
export default function (vertices) {
    const length = vertices.length;
    let normals = new Array(length);
    let index, vecA, vecB, edge, oldX, vlen;
    for (index = 0; index < length - 1; ++index) {
        vecA = vertices[index];
        vecB = vertices[index + 1];
        edge = Sub(vecB, vecA);
        oldX = edge[0];
        edge[0] = edge[1];
        edge[1] = -oldX;
        normals[index] = Normalize(edge);
    }
    vecA = vertices[length - 1];
    vecB = vertices[0];
    edge = Sub(vecB, vecA);
    oldX = edge[0];
    edge[0] = edge[1];
    edge[1] = -oldX;
    normals[length - 1] = Normalize(edge);
    return normals;
}
*/

function Normalize(x, y) {
    /*
const x = a[0];
        const y = a[1];
        const lsq = x * x + y * y;

        if (lsq > 0)
        {
            const lr = 1 / Math.sqrt(lsq);

            dst[0] = x * lr;
            dst[1] = y * lr;
        }
        else
        {
            dst[0] = 0;
            dst[1] = 0;
        }

        return dst;
    */
    const lsq = x * x + y * y;
    let dx = 0;
    let dy = 0;

    if (lsq > 0) {
        const lr = 1 / Math.sqrt(lsq);

        dx = x * lr;
        dy = y * lr;
    } else {
        dx = 0;
        dy = 0;
    }

    return [dx, dy];
}

function DODGetNormalizedPolygonAxes(id, start, length, globalPositionX, globalPositionY) {
    let index = 0;
    let oldX = 0.0;
    let vecAX = 0.0;
    let vecAY = 0.0;
    let vecBX = 0.0;
    let vecBY = 0.0;
    let edgeX = 0.0;
    let edgeY = 0.0;
    let normalsIndex = NormalsPoolUsed;
    let norm = 0.0;
    let x = globalPositionX[id];
    let y = globalPositionY[id];
    /*
    const length = vertices.length;
        let normals = new Array(length);
        let index, vecA, vecB, edge, oldX, vlen;
        for (index = 0; index < length - 1; ++index) {
            vecA = vertices[index];
            vecB = vertices[index + 1];
            edge = Sub(vecB, vecA);
            oldX = edge[0];
            edge[0] = edge[1];
            edge[1] = -oldX;
            normals[index] = Normalize(edge);
        }
        vecA = vertices[length - 1];
        vecB = vertices[0];
        edge = Sub(vecB, vecA);
        oldX = edge[0];
        edge[0] = edge[1];
        edge[1] = -oldX;
        normals[length - 1] = Normalize(edge);
        return normals;
        export default function (a, dst = new vec2(2)) {

        

    }
    */
    for (; index < length - 1; ++index) {
        vecAX = x + SystemPColliderDataX[start + index];
        vecAY = y + SystemPColliderDataY[start + index];
        vecBX = x + SystemPColliderDataX[start + index + 1];
        vecBY = y + SystemPColliderDataY[start + index + 1];
        edgeX = vecBY - vecAY;
        edgeY = -(vecBX - vecAX);
        vecAX = Normalize(edgeX, edgeY);
        edgeX = vecAX[0];
        edgeY = vecAX[1];
        /*norm = edgeX * edgeX + edgeY * edgeY;
        if (norm > 0) {
            norm = 1 / Sqrt(norm);
            edgeX *= norm;
            edgeY *= norm;
        } else {
            edgeX = 0;
            edgeY = 0;
        }*/
        NormalsPoolX[NormalsPoolUsed] = edgeX;
        NormalsPoolY[NormalsPoolUsed] = edgeY;
        NormalsPoolUsed++
    }
    vecAX = x + SystemPColliderDataX[start + length - 1];
    vecAY = y + SystemPColliderDataY[start + length - 1];
    vecBX = x + SystemPColliderDataX[start];
    vecBY = y + SystemPColliderDataY[start];
    edgeX = vecBY - vecAY;
    edgeY = -(vecBX - vecAX);
    /*norm = edgeX * edgeX + edgeY * edgeY;
    if (norm > 0) {
        norm = 1 / Sqrt(norm);
        edgeX *= norm;
        edgeY *= norm;
    } else {
        edgeX = 0;
        edgeY = 0;
    }*/
    vecAX = Normalize(edgeX, edgeY);
    edgeX = vecAX[0];
    edgeY = vecAX[1];
    NormalsPoolX[NormalsPoolUsed] = edgeX;
    NormalsPoolY[NormalsPoolUsed] = edgeY;
    NormalsPoolUsed++
    return normalsIndex;
}

function DODGetProjectionRange(id, start, length, axisX, axisY, container, globalPositionX, globalPositionY) {
    let resultX = 0.0;
    let resultY = 0.0;
    let minp = MAX_NUM;
    let maxp = -MAX_NUM;
    let index = 0;
    let dotValue = 0.0;
    let x = globalPositionX[id];
    let y = globalPositionY[id];

    for (; index < length; ++index) {
        dotValue = (x + SystemPColliderDataX[start + index]) * axisX;
        dotValue += (y + SystemPColliderDataY[start + index]) * axisY;
        dotValue *= 1000;
        minp = dotValue ^ ((minp ^ dotValue) & -(minp < dotValue));
        maxp = maxp ^ ((maxp ^ dotValue) & -(maxp < dotValue));
    }
    container[0] = minp / 1000;
    container[1] = maxp / 1000;
}