import json
import pickle
from pathlib import Path

import pandas as pd
from flask import Flask
from flask_cors import CORS
from flask_restful import Api, Resource
from flask_restful.reqparse import RequestParser
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


# Folder containing the trained model and app data files.
MODELS_FOLDER = Path(__file__).parent.parent / "models"


# Load everything once when the backend starts.
with open(MODELS_FOLDER / "genre_model.pkl", "rb") as file:
    model_package = pickle.load(file)

model = model_package["model"]
genres = model_package["genres"]
feature_names = model_package["feature_names"]

with open(MODELS_FOLDER / "thresholds.json") as file:
    tuned_thresholds = json.load(file)

# These can change while the app is running.
current_thresholds = tuned_thresholds.copy()

songs = pd.read_csv(MODELS_FOLDER / "songs.csv", index_col="song_id")


test_results = pd.read_csv(MODELS_FOLDER / "test_probabilities.csv",index_col="song_id",)

threshold_curves = pd.read_csv(MODELS_FOLDER / "threshold_curves.csv")

feature_importance = pd.read_csv(MODELS_FOLDER / "feature_importance.csv")


app = Flask("Spotify genre backend")
CORS(app)
api = Api(app)


def pick_genre(probabilities):
    """Return the highest-probability genre that passes its threshold."""
    genres_that_pass = [
        genre
        for genre in genres
        if probabilities[genre] >= current_thresholds[genre]
    ]

    if not genres_that_pass:
        return "not sure"

    return max(genres_that_pass, key=probabilities.get)


def make_prediction(song_features):
    """Predict a genre from a one-row table of model features."""
    probabilities = dict(zip(genres, model.predict_proba(song_features)[0].tolist()))

    return {
        "prediction": pick_genre(probabilities),
        "probabilities": {
            genre: round(probability, 4)
            for genre, probability in probabilities.items()
        },
        "thresholds": current_thresholds,
    }


class Home(Resource):
    def get(self):
        return {
            "message": "Spotify genre classifier backend is running",
            "genres": genres,
            "songs": len(songs),
            "test_songs": len(test_results),
        }


class Thresholds(Resource):
    def __init__(self):
        self.parser = RequestParser()

        for genre in genres:
            self.parser.add_argument(
                genre,
                type=float,
                required=False,
                location="args",
            )

    def get(self):
        return {
            "current": current_thresholds,
            "tuned": tuned_thresholds,
        }

    def put(self):
        new_thresholds = self.parser.parse_args()

        for genre in genres:
            value = new_thresholds[genre]

            if value is not None and 0 <= value <= 1:
                current_thresholds[genre] = value

        return self.get()


class SearchSongs(Resource):
    def __init__(self):
        self.parser = RequestParser()
        self.parser.add_argument(
            "search",
            type=str,
            required=True,
            location="args",
        )

    def get(self):
        search_text = self.parser.parse_args()["search"].strip().lower()

        name_matches = songs["track_name"].str.lower().str.contains(
            search_text,
            regex=False,
        )
        artist_matches = songs["artists"].str.lower().str.contains(
            search_text,
            regex=False,
        )

        matching_songs = songs[name_matches | artist_matches].head(20)

        results = []

        for song_id, song in matching_songs.iterrows():
            results.append({
                "song_id": int(song_id),
                "track_id": song["track_id"],
                "track_name": song["track_name"],
                "artists": song["artists"],
                "genre": song["genre"],
                "set": song["set"],
            })

        return {"songs": results}


class PredictSong(Resource):
    def __init__(self):
        self.parser = RequestParser()
        self.parser.add_argument(
            "song_id",
            type=int,
            required=True,
            location="args",
        )

    def get(self):
        song_id = self.parser.parse_args()["song_id"]

        if song_id not in songs.index:
            return {"error": f"No song with id {song_id}"}, 404

        song = songs.loc[song_id]
        song_features = songs.loc[[song_id], feature_names]
        result = make_prediction(song_features)

        result["song"] = {
            "song_id": song_id,
            "track_id": song["track_id"],
            "track_name": song["track_name"],
            "artists": song["artists"],
            "true_genre": song["genre"],
            "set": song["set"],
        }

        if song["set"] == "train":
            result["warning"] = (
                "This song was used to train the model, "
                "so the prediction is not a fair test."
            )

        return result


class PredictFeatures(Resource):
    def __init__(self):
        self.parser = RequestParser()

        for feature in feature_names:
            self.parser.add_argument(
                feature,
                type=float,
                required=True,
                location="args",
            )

    def get(self):
        values = self.parser.parse_args()

        song_features = pd.DataFrame([
            {feature: values[feature] for feature in feature_names}
        ])

        # Match the number types used when training the model.
        song_features = song_features.astype(
            songs[feature_names].dtypes.to_dict()
        )

        return make_prediction(song_features)


class Results(Resource):
    def get(self):
        true_genres = test_results["true_genre"].tolist()

        predictions = [
            pick_genre(probabilities)
            for probabilities in test_results[genres].to_dict(orient="records")
        ]

        report = classification_report(
            true_genres,
            predictions,
            labels=genres,
            output_dict=True,
            zero_division=0,
        )

        matrix = confusion_matrix(
            true_genres,
            predictions,
            labels=genres + ["not sure"],
        )

        return {
            "test_songs": len(predictions),
            "not_sure": predictions.count("not sure"),
            "accuracy": round(accuracy_score(true_genres, predictions), 3),
            "macro_f1": round(report["macro avg"]["f1-score"], 3),
            "per_genre": {
                genre: {
                    "precision": round(report[genre]["precision"], 3),
                    "recall": round(report[genre]["recall"], 3),
                    "f1": round(report[genre]["f1-score"], 3),
                }
                for genre in genres
            },
            "confusion_matrix": {
                "labels": genres + ["not sure"],
                "values": matrix[:len(genres)].tolist(),
            },
        }


class ThresholdCurves(Resource):
    def get(self):
        return {
            "thresholds": threshold_curves["threshold"].tolist(),
            "f1": {
                genre: threshold_curves[genre].round(3).tolist()
                for genre in genres
            },
        }


class FeatureImportance(Resource):
    def get(self):
        return {
            "features": feature_importance.round(4).to_dict(orient="records")
        }


api.add_resource(Home, "/")
api.add_resource(Thresholds, "/thresholds")
api.add_resource(SearchSongs, "/songs")
api.add_resource(PredictSong, "/predict/song")
api.add_resource(PredictFeatures, "/predict")
api.add_resource(Results, "/results")
api.add_resource(ThresholdCurves, "/threshold-curves")
api.add_resource(FeatureImportance, "/feature-importance")


if __name__ == "__main__":
    app.run(port=5001, debug=True)