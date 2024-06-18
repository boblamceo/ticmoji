import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { AwesomeButton } from "react-awesome-button";
// import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
// import "@tensorflow/tfjs-core";
// // Register WebGL backend.
// import "@tensorflow/tfjs-backend-webgl";
// import "@mediapipe/face_mesh";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import "react-awesome-button/dist/styles.css";

function detectWinner(board) {
    const winningCombinations = [
        // Rows
        [board[0][0], board[0][1], board[0][2]],
        [board[1][0], board[1][1], board[1][2]],
        [board[2][0], board[2][1], board[2][2]],
        // Columns
        [board[0][0], board[1][0], board[2][0]],
        [board[0][1], board[1][1], board[2][1]],
        [board[0][2], board[1][2], board[2][2]],
        // Diagonals
        [board[0][0], board[1][1], board[2][2]],
        [board[0][2], board[1][1], board[2][0]],
    ];

    for (const combination of winningCombinations) {
        if (combination.every((cell) => cell === "1")) {
            return "1";
        }
        if (combination.every((cell) => cell === "2")) {
            return "2";
        }
    }

    return null;
}

function detectEmotion(facialLandmarks, board) {
    const {
        eyeBlinkLeft,
        eyeBlinkRight,
        eyeSquintLeft,
        eyeSquintRight,
        mouthSmileLeft,
        mouthSmileRight,
        jawOpen,
        mouthPucker,
        mouthShrugLower,
    } = facialLandmarks;

    const isHappyWithEyesOpen =
        mouthSmileLeft > 0.5 &&
        mouthSmileRight > 0.5 &&
        eyeSquintLeft < 0.2 &&
        eyeSquintRight < 0.2;

    const isSad = mouthPucker > 0.7 || mouthShrugLower > 0.7;

    const isWinking =
        (eyeBlinkLeft > 0.2 && eyeBlinkRight < 0.2) ||
        (eyeBlinkLeft < 0.2 && eyeBlinkRight > 0.2);
    const isSurprised =
        eyeSquintLeft < 0.2 && eyeSquintRight < 0.2 && jawOpen > 0.5;
    const isHappyWithEyesClosed =
        mouthSmileLeft > 0.5 &&
        mouthSmileRight > 0.5 &&
        eyeSquintLeft > 0.2 &&
        eyeSquintRight > 0.2;
    const isYawning = jawOpen > 0.3;
    const isDiagonalMouth =
        mouthSmileLeft > mouthSmileRight * 5 ||
        mouthSmileRight > mouthSmileLeft * 5;
    if (isHappyWithEyesOpen && isNaN(board[0][0])) {
        return [0, 0];
    } else if (isWinking && isNaN(board[0][2])) {
        return [0, 2];
    } else if (isSurprised && isNaN(board[1][1])) {
        return [1, 1];
    } else if (isHappyWithEyesClosed && isNaN(board[1][2])) {
        return [1, 2];
    } else if (isYawning && isNaN(board[2][0])) {
        return [2, 0];
    } else if (isSad && isNaN(board[0][1])) {
        return [0, 1];
    } else if (isDiagonalMouth && isNaN(board[2][2])) {
        return [2, 2];
    } else if (isNaN(board[1][0])) {
        return [1, 0];
    } else {
        return null;
    }
}

const Tictactoe = () => {
    const webcamRef = useRef(null);
    let location = useLocation();
    const defaultBoard = [
        ["😀", "☹️", "😉"],
        ["😑", "😮", "😊"],
        ["😫", "", "🫤"],
    ];
    const [board, setBoard] = useState(defaultBoard);
    const [player, setPlayer] = useState("1");
    const [faceLandmarker, setFaceLandmarker] = useState(undefined);
    const [result, setResult] = useState(undefined);
    const navigate = useNavigate();
    const confirm = () => {
        if (
            isNaN(board[result[0]][result[1]]) ||
            !board[result[0]][result[1]]
        ) {
            let boardCopy = board;
            boardCopy[result[0]][result[1]] = player;

            setBoard(boardCopy);
            setPlayer(player === "1" ? "2" : "1");
        }
    };
    useEffect(() => {
        const winner = detectWinner(board);
        if (winner) {
            alert(`The winner is player ${winner}`);
        }
    }, [JSON.stringify(board)]);
    useEffect(() => {
        if (!location.state) {
            navigate("/");
        }
    }, [location]);
    const detect = async () => {
        // Check data is available
        if (
            typeof webcamRef.current !== "undefined" &&
            webcamRef.current !== null &&
            webcamRef.current.video.readyState === 4
        ) {
            // Get Video Properties
            const video = webcamRef.current.video;
            const videoWidth = webcamRef.current.video.offsetWidth;
            const videoHeight = webcamRef.current.video.offsetHeight;
            // Set video width
            webcamRef.current.video.width = videoWidth;
            webcamRef.current.video.height = videoHeight;
            const faceLandmarkerResult = faceLandmarker.detect(video);
            if (faceLandmarkerResult.faceBlendshapes[0]) {
                const values = Object.values(
                    faceLandmarkerResult.faceBlendshapes[0].categories
                ).reduce(
                    (acc, value) => ({
                        ...acc,
                        [value.categoryName]: value.score,
                    }),
                    {}
                );
                const emotion = detectEmotion(values, board);
                if (emotion) {
                    setResult(emotion);
                }
            } else {
                setResult([2, 1]);
            }
        }
    };

    useEffect(() => {
        if (faceLandmarker) {
            const interval = setInterval(() => {
                detect();
            }, 100);
            return () => clearInterval(interval);
        }
    }, [faceLandmarker]);
    const runFaceLandmarks = async () => {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const facelandmarkerCopy = await FaceLandmarker.createFromOptions(
            filesetResolver,
            {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU",
                },
                outputFaceBlendshapes: true,
                runningMode: "IMAGE",
                numFaces: 1,
            }
        );
        setFaceLandmarker(facelandmarkerCopy);
        console.log(facelandmarkerCopy);
    };
    useEffect(() => {
        runFaceLandmarks();
    }, []);
    return (
        <div className="background">
            <div className="tic-left">
                <div className="board">
                    {board.map((row, rowIndex) => {
                        if (!result) {
                            return (
                                <div className="row" key={rowIndex}>
                                    {row.map((square, squareIndex) => (
                                        <div
                                            className={`box`}
                                            key={squareIndex}
                                        >
                                            {square}
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        return (
                            <div className="row" key={rowIndex}>
                                {row.map((square, squareIndex) => (
                                    <div
                                        className={`box ${
                                            square === "1"
                                                ? "X"
                                                : square === "2"
                                                ? "O"
                                                : ""
                                        }`}
                                        key={squareIndex}
                                    >
                                        {square === "1"
                                            ? "X"
                                            : square === "2"
                                            ? "O"
                                            : square}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="tic-right">
                <h1 className="player-text">Player {player}</h1>
                <Webcam className="webcam" ref={webcamRef} />
                {result && (
                    <div className="prediction">
                        Prediction: {defaultBoard[result[0]][result[1]]}
                    </div>
                )}
                <AwesomeButton
                    type="primary"
                    onPress={() => {
                        confirm();
                    }}
                >
                    Confirm
                </AwesomeButton>
            </div>
        </div>
    );
};

export default Tictactoe;
