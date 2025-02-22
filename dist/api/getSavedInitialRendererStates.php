<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: access");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

include "db_connection.php";
include "permissionsAndSettingsForOneCourseFunction.php";

$jwtArray = include "jwtArray.php";
$userId = $jwtArray["userId"];

$_POST = json_decode(file_get_contents("php://input"), true);
$doenetId = mysqli_real_escape_string($conn, $_POST["doenetId"]);

$cids = array_map(function($item) use($conn) {
  return mysqli_real_escape_string($conn, $item);
}, $_POST["cids"]);


$success = true;
$message = "";
if ($doenetId == "") {
    $success = false;
    $message = "Internal Error: missing doenetId";
} elseif ($userId == "") {
    $success = false;
    $message = "No access - Need to sign in";
}

if ($success) {

    $sql = "SELECT courseId from course_content
        WHERE doenetId='$doenetId'
        ";

    $result = $conn->query($sql);
    if ($result->num_rows > 0){
        $row = $result->fetch_assoc();
        $courseId = $row["courseId"];

        $permissions = permissionsAndSettingsForOneCourseFunction(
            $conn,
            $userId,
            $courseId
        );
        if ($permissions["canEditContent"] != "1") {
            $success = false;
            $message = "You need edit permission get finished initial renderer state.";
        }
    } else {
        $success = FALSE;
        $message = "Assignment not found.";
    }
}


if ($success) {
    $foundVariants = [];

    $nCids = count($cids);

    foreach($cids AS $cid) {

        $sql = "SELECT variantIndex FROM initial_renderer_state
        WHERE cid = '$cid'";

        $result = $conn->query($sql);

        $newVariants = array();

        while($row = $result->fetch_assoc()){ 
          $newVariants[] = $row['variantIndex'];
        }

        array_push($foundVariants, $newVariants);
    }

}

$response_arr = [
    "success" => $success,
    "message" => $message,
    "foundVariants"=>$foundVariants,
];

http_response_code(200);

echo json_encode($response_arr);

$conn->close();
?>
