// Plain information about the model, how to use the app, and when not to trust it
export default function AboutPage() {
  return (
    <div className="about">
      <section className="card">
        <h2>What the app does</h2>
        <p>
          The app guesses the genre of a song from Spotify's audio features, like energy, acousticness and tempo. It
          knows six genres: classical, country, heavy-metal, hip-hop, jazz and techno. The model is the XGBoost model
          from my previous assignment, trained in production/train_model.ipynb and served by a Flask backend.
        </p>
        <h3>How to use it</h3>
        <ol>
          <li>On "Predict a song", search for a song from the dataset, or describe a song yourself with the sliders.</li>
          <li>The model shows its answer and the probability for every genre.</li>
          <li>On "Thresholds &amp; test results", change how sure the model must be before it answers, and see how the test results change.</li>
          <li>On "Feature importance", see which features the model relies on.</li>
        </ol>
      </section>

      <section className="card">
        <h2>The model</h2>
        <ul className="plain-list">
          <li>Data: the Spotify Tracks dataset from Kaggle. After cleaning, 4,650 songs: 3,720 for training and 930 for testing.</li>
          <li>Without thresholds, the model gets an accuracy of 0.881 and a macro F1 of 0.863 on the test set.</li>
          <li>
            Thresholds: every genre has its own threshold, tuned with cross-validation on the training data for the
            best F1. If no genre reaches its threshold, the answer is "not sure".
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>When not to trust it</h2>
        <ul className="plain-list">
          <li>It only knows six genres. A pop or rock song still gets one of the six, or "not sure", but never "pop".</li>
          <li>
            It relies a lot on popularity, which is not about the sound. Songs from small, unknown artists can be pushed
            towards jazz, country or classical.
          </li>
          <li>
            Songs marked "training song" were used to train the model, so the model has already seen them. Only the
            test songs show how good it really is.
          </li>
          <li>
            The genre in the dataset comes from Spotify playlists and can be wrong. For example, "Zara Zara - Lofi" is
            listed as classical.
          </li>
          <li>
            New songs can't be looked up, because Spotify closed its audio features API for new apps in 2024. That is
            why the app only searches the dataset, or lets you type the values in.
          </li>
          <li>
            The thresholds are stored in the backend's memory, so all users share them and they reset when the backend
            restarts. The backend runs on Flask's development server, which is fine for testing but not for real users.
          </li>
        </ul>
      </section>
    </div>
  )
}
