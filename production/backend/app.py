import json
import os
import pickle

import pandas as pd
from flask import Flask
from flask_cors import CORS
from flask_restful import Api, Resource
from flask_restful.reqparse import RequestParser
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


# The models folder is next to the backend folder: production/models
MODELS_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'models')

# Load the model and the results ONCE, when the backend starts
with open(os.path.join(MODELS_FOLDER, 'genre_model.pkl'), 'rb') as f:
    model_package = pickle.load(f)

model = model_package['model']
genres = model_package['genres']
feature_names = model_package['feature_names']

with open(os.path.join(MODELS_FOLDER, 'thresholds.json')) as f:
    tuned_thresholds = json.load(f)
    

# The thresholds the app uses right now. A copy, so the tuned ones never change.
current_thresholds = dict(tuned_thresholds)

test_results = pd.read_csv(os.path.join(MODELS_FOLDER, 'test_probabilities.csv'), index_col='song_id')
threshold_curves = pd.read_csv(os.path.join(MODELS_FOLDER, 'threshold_curves.csv'))
feature_importance = pd.read_csv(os.path.join(MODELS_FOLDER, 'feature_importance.csv'))
songs = pd.read_csv(os.path.join(MODELS_FOLDER, 'songs.csv'), index_col='song_id')

app = Flask('Spotify genre backend')
CORS(app)        # lets the React app, which runs on another port, call this backend
api = Api(app)

def pick_genre(probabilities):
    """Of the genres that reach their threshold, the one with the highest probability.
    If no genre reaches its threshold, the answer is 'not sure'."""
    passed = [genre for genre in genres if probabilities[genre] >= current_thresholds[genre]]
    if len(passed) == 0:
        return 'not sure'
    return max(passed, key=lambda genre: probabilities[genre])


def make_prediction(row):
    """Predict one song (a table with one row and the 15 feature columns)."""
    probabilities = dict(zip(genres, model.predict_proba(row)[0].tolist()))
    return {
        'prediction': pick_genre(probabilities),
        'probabilities': {genre: round(p, 4) for genre, p in probabilities.items()},
        'thresholds': current_thresholds,
    }


class Home(Resource):
    def get(self):
        return {'message': 'Spotify genre classifier backend is running',
                'genres': genres, 'songs': len(songs), 'test_songs': len(test_results)}


class Thresholds(Resource):
    def __init__(self):
        self.reqparser = RequestParser()
        for genre in genres:
            self.reqparser.add_argument(genre, type=float, required=False, location='args')

    def get(self):
        return {'current': current_thresholds, 'tuned': tuned_thresholds}

    def put(self):
        args = self.reqparser.parse_args()
        for genre in genres:
            value = args[genre]
            # Only change the genres that were sent, and only to a value between 0 and 1
            if value is not None and 0 <= value <= 1:
                current_thresholds[genre] = value
        return self.get()






class SearchSongs(Resource):
    def __init__(self):
        self.reqparser = RequestParser()
        self.reqparser.add_argument('search', type=str, required=True, location='args')

    def get(self):
        search = self.reqparser.parse_args()['search'].strip().lower()

        # Songs where the name or the artist contains the search text
        in_name = songs['track_name'].str.lower().str.contains(search, regex=False)
        in_artist = songs['artists'].str.lower().str.contains(search, regex=False)
        matches = songs[in_name | in_artist].head(20)

        results = []
        for song_id, song in matches.iterrows():
            # track_id is Spotify's own id, so the frontend can get the album cover from Spotify
            results.append({'song_id': int(song_id), 'track_id': song['track_id'], 'track_name': song['track_name'],
                            'artists': song['artists'], 'genre': song['genre'], 'set': song['set']})
        return {'songs': results}


class PredictSong(Resource):
    def __init__(self):
        self.reqparser = RequestParser()
        self.reqparser.add_argument('song_id', type=int, required=True, location='args')

    def get(self):
        song_id = self.reqparser.parse_args()['song_id']
        if song_id not in songs.index:
            return {'error': f'No song with id {song_id}'}, 404

        result = make_prediction(songs.loc[[song_id], feature_names])
        song = songs.loc[song_id]
        result['song'] = {'song_id': song_id, 'track_id': song['track_id'], 'track_name': song['track_name'],
                          'artists': song['artists'], 'true_genre': song['genre'], 'set': song['set']}
        if song['set'] == 'train':
            result['warning'] = 'This song was used to train the model, so the prediction is not a fair test.'
        return result


class PredictFeatures(Resource):
    def __init__(self):
        self.reqparser = RequestParser()
        for name in feature_names:
            self.reqparser.add_argument(name, type=float, required=True, location='args')

    def get(self):
        args = self.reqparser.parse_args()
        row = pd.DataFrame([{name: args[name] for name in feature_names}])
        # Same number types as the training data (for example key as a whole number)
        row = row.astype(songs[feature_names].dtypes.to_dict())
        return make_prediction(row)


class Results(Resource):
    def get(self):
        true_genres = test_results['true_genre'].tolist()

        # Predict every test song with the current thresholds, like the app does
        predictions = []
        for song_id, row in test_results[genres].iterrows():
            predictions.append(pick_genre(row.to_dict()))

        # Precision, recall and F1 for every genre ('not sure' counts as a wrong answer)
        report = classification_report(true_genres, predictions, labels=genres,
                                       output_dict=True, zero_division=0)
        # Rows = real genre, columns = predicted genre, with an extra column for 'not sure'
        matrix = confusion_matrix(true_genres, predictions, labels=genres + ['not sure'])

        return {
            'test_songs': len(predictions),
            'not_sure': predictions.count('not sure'),
            'accuracy': round(accuracy_score(true_genres, predictions), 3),
            'macro_f1': round(report['macro avg']['f1-score'], 3),
            'per_genre': {genre: {'precision': round(report[genre]['precision'], 3),
                                  'recall': round(report[genre]['recall'], 3),
                                  'f1': round(report[genre]['f1-score'], 3)} for genre in genres},
            'confusion_matrix': {'labels': genres + ['not sure'],
                                 'values': matrix[:len(genres)].tolist()},
        }


class ThresholdCurves(Resource):
    def get(self):
        return {'thresholds': threshold_curves['threshold'].tolist(),
                'f1': {genre: threshold_curves[genre].round(3).tolist() for genre in genres}}


class FeatureImportance(Resource):
    def get(self):
        return {'features': feature_importance.round(4).to_dict(orient='records')}


api.add_resource(Home, '/')
api.add_resource(Thresholds, '/thresholds')

api.add_resource(SearchSongs, '/songs')
api.add_resource(PredictSong, '/predict/song')
api.add_resource(PredictFeatures, '/predict')

api.add_resource(Results, '/results')
api.add_resource(ThresholdCurves, '/threshold-curves')
api.add_resource(FeatureImportance, '/feature-importance')

if __name__ == '__main__':
    app.run(port=5001, debug=True)