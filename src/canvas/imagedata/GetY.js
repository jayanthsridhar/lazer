//  Based on the given index return the Y component

export default function GetY (imageData, index) {

    return Math.floor(Math.floor(index / imageData.width) / 4);

}
