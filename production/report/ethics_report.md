# Ethical considerations

*Spotify genre classifier · ML in Production Environment*

> **In short:** the app is a helpful tool for exploring six well-known genres, and it is open about how sure it is. It is not a judge of what genre a song "really" is.

## Data

The model uses a Kaggle dataset of Spotify songs. The full dataset has 114 genres, but the model only uses six: classical, country, heavy-metal, hip-hop, jazz and techno. After cleaning, 4,650 songs are left: 3,720 for training and 930 for testing.

**The labels are not facts.** Each song has one genre label, which shows how it was grouped when the data was collected, not a musical truth. Many songs fit more than one genre, but songs listed under more than one of the six genres were removed during cleaning. This made the data cleaner, but the model has never learned from mixed songs, which are common in real music.

**The genres are mostly Western.** The full dataset also has genres like indian, k-pop and samba, but this model only knows six genres from American and European music. Other music gets forced into one of them or gets "not sure". Even "classical" mixes traditions: Mozart sits next to Indian classical singers like Bhimsen Joshi.

**Uneven groups.** There are 991 heavy-metal songs but only 500 jazz songs, so the model has fewer jazz examples to learn from, and jazz is also the genre it gets wrong most often. Songs by the same artist can also be in both the training and the test set, which can make the results look a bit too good.

## The model

The model is XGBoost (many decision trees working together) and uses 14 features that describe the song, like acousticness, danceability and tempo.

**Popularity was left out on purpose.** Popularity measures how much a song is played, not how it sounds. With it, the model would partly learn which genres are popular, so a new artist with few plays could get a different answer just for being unknown. Leaving it out lowered the accuracy from 0.881 to 0.817 (without thresholds), which is worth it for a tool that should judge the sound, not the fame.

**A limitation:** the XGBoost settings were found with RandomizedSearchCV in the first part of the project, while popularity was still included, so they may not be the best settings now. A next step would be to tune the model again and test it on artists it has never seen.

## Threshold tuning: when should the app say "not sure"?

**What a threshold is.** For every song, the model gives each genre a probability: how likely it thinks that genre is. A normal model always picks the genre with the highest probability, even if it is only 30%. This app gives each genre a threshold instead: the lowest probability the genre needs before the app picks it. If no genre reaches its threshold, the app says "not sure". If several do, the highest one wins.

**How the thresholds were chosen.** For each genre, thresholds from 0.05 to 0.95 were tested, and the one with the best F1 score was kept. F1 is a score from 0 to 1 that is only high when the model finds most songs of a genre and is also usually right when it names that genre. This was done with 5-fold cross-validation on the training songs (each song was predicted by a model that hadn't seen it), so the test songs were never used and the test stays fair. The result: country 0.30, classical and jazz 0.35, techno 0.40, hip-hop 0.45 and heavy-metal 0.55.

**An example.** "justified" by Kacey Musgraves is labeled country. The model gives hip-hop the highest probability, 30%, but hip-hop needs 45%. Country only gets 17%, and no other genre reaches its threshold either. So instead of a confident wrong answer, the app says "not sure". This happened for 37 of the 930 test songs.

**What changed.** When the app answers, it is right more often: 82.9% of the time instead of 81.7%. But if "not sure" counts as a wrong answer, the accuracy drops from 0.817 to 0.796, and the macro F1 (the average F1 of the six genres) from 0.797 to 0.793. So the thresholds don't make the model smarter. They make it more careful.

**The ethical questions:**

- **"Not sure" doesn't hit everyone equally.** It is more honest than a wrong guess, but 6–7% of the hip-hop and jazz songs got "not sure", and only 1 of the 161 classical songs. It happens when the probabilities are spread over several genres, which is typical for songs that mix styles, like "justified".
- **Different rules for different genres.** A song needs 55% to be called heavy-metal, but only 30% to be called country. So the app now calls more songs country (134 instead of 126), and more of them wrongly: when it says country, it is right 69% of the time instead of 72%. For heavy-metal it is the opposite: the app is right more often (92% instead of 89%), but finds fewer of the real heavy-metal songs (87% instead of 93%). Each threshold is a choice between two mistakes: a wrong genre, or a missed song. F1 treats both as equally bad, but in a real product a person should make that choice on purpose.
- **The numbers can be made to look better.** With every threshold at 0.70, the app is right 91.8% of the time when it answers, but it says "not sure" for 245 of the 930 songs. That is why the app counts "not sure" as wrong in its accuracy and always shows how many songs got "not sure".
- **One change affects everyone.** The sliders make the model easier to understand, because users see the results change right away. But the thresholds are stored in the backend, so one user's change affects every user, there is no login to stop it, and the changes are lost when the backend restarts.
- **Real consequences.** If a streaming service sorted songs into playlists with a model like this, wrong genres could send artists to the wrong listeners. Artists who mix genres, or make music outside the six genres, would be hit the hardest.

## Feature importance

**Permutation importance** shuffles one feature at a time in the test songs and measures how much worse the model gets: the bigger the drop, the more the model needs that feature. **XGBoost total gain** measures how much each feature helped the trees split the songs during training. Both agree that acousticness matters most, followed by danceability and instrumentalness.

This shows users what the model "listens" to, but it describes the model, not the music: a song isn't jazz because of its acousticness score. Features that go together can also share the importance. Energy and loudness have a correlation of 0.83, so each of them can look less important than it really is.

## Usability and accessibility

The app is one page with three views: Predict, Thresholds and Features. Users can search for a song (also with ⌘K) or describe one with sliders. For songs from the dataset, the prediction is shown next to the real label, so users can see when the model is wrong. Probability bars with a line for each threshold show how sure the model is, and "not sure" comes with a short explanation, like "hip-hop is most likely (30%), but below its threshold". Extra details stay hidden until the user opens them.

Album covers, music videos and DJ mode make the app fun, but they can also pull attention away from the model's limits. The moving background stops for people who have turned off animations on their computer, but the light grey text on the dark glass design can be hard to read for people with weak eyesight. The app also only knows six genres, can only judge songs from the dataset or songs described with the sliders, and needs two servers to start, so it is a demo, not a product for people who aren't technical.

## Trustworthiness and responsible use

The app helps users decide how much to trust it. It shows the test results for the current thresholds (accuracy 0.796 and macro F1 0.793 with the tuned ones), shows the real label next to each prediction, warns when a song was used in training (then the result is not a fair test), and says "not sure" instead of guessing. The backend also checks the input: missing or wrong values give an error, and thresholds outside 0–1 are ignored. But none of this fixes doubtful labels or the missing genres.

There is no login, so anyone who can reach the backend can change the thresholds for everyone. Covers, previews and videos come from Spotify, Apple, YouTube and Wikidata. The app has no control over these services: a video found by search can be the wrong one, and the services can see which songs a user looks up.

> **Conclusion:** the classifier works best as a helpful hint for clear examples of the six genres. It should not be the final word on mixed, culturally specific or unusual music, and it should not be used to make important decisions about artists.
