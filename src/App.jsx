import "./App.css";
import { useNavigate } from "react-router-dom";

function App() {
    const navigate = useNavigate();
    return (
        <div className="background">
            <div className="home-green-background">
                <div className="home-pink-background">
                    <div className="home-emoji-background">
                        <h1 className="ticmoji-text">TICMOJI</h1>
                        <button
                            className="learn-more"
                            onClick={() => {
                                navigate("/game", { state: { direct: true } });
                            }}
                        >
                            😁 How are you feeling right now? ➡️
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
