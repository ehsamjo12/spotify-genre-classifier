# Ethical considerations

*Spotify genre classifier · ML in Production Environment*

> **In short:** the app is a helpful tool for exploring six well-known genres, and it is open about how sure it is. But it is a weak model: it gets about one song in five wrong, and many more for music that doesn't look like its training data, like Indian music and songs that mix genres. It can give a helpful hint, but it should not decide what genre a song "really" is, and it should never be used to make decisions about artists.

## Data

The model uses a Kaggle dataset of Spotify songs. The full dataset has 114 genres, but the model only uses six: classical, country, heavy-metal, hip-hop, jazz and techno. After cleaning, 4,650 songs are left: 3,720 for training and 930 for testing.

**The labels are not facts.** Each song has one genre label, which shows how it was grouped when the data was collected, not a musical truth. Many songs fit more than one genre, but songs listed under more than one of the six genres were removed during cleaning. This made the data cleaner, but the model has never learned from mixed songs, which are common in real music.

**The genres are mostly Western.** The full dataset also has genres like indian, k-pop and samba, but this model only knows six genres from American and European music. Other music gets forced into one of them or gets "not sure". Even "classical" mixes traditions: Mozart sits next to Indian classical singers like Bhimsen Joshi. The section "Who gets the mistakes?" shows what this does to the results.

**Uneven groups.** There are 991 heavy-metal songs but only 500 jazz songs, so the model has fewer jazz examples to learn from, and jazz is also the genre it gets wrong most often. Songs by the same artist can also be in both the training and the test set, which makes the results look better than they really are (see "Why this is a weak model").

## The model

The model is XGBoost (many decision trees working together). It uses 14 features: 13 describe the sound, like acousticness, danceability and tempo, and one, "explicit", says whether the lyrics are explicit.

**Popularity was left out on purpose.** Popularity measures how much a song is played, not how it sounds. With it, the model would partly learn which genres are popular, so a new artist with few plays could get a different answer just for being unknown. Leaving it out lowered the accuracy from 0.881 to 0.817 (without thresholds), which is worth it for a tool that should judge the sound, not the fame.

**The "explicit" feature is a problem.** It is about the lyrics, not the sound, and it mostly points to one genre: 25% of the hip-hop songs are explicit, but none of the classical songs. Using it risks teaching the model that explicit lyrics mean hip-hop, which is a stereotype. In the permutation test it is also the least important of the 14 features, so removing it would cost almost nothing.

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

## Feature importance

**Permutation importance** shuffles one feature at a time in the test songs and measures how much worse the model gets: the bigger the drop, the more the model needs that feature. **XGBoost total gain** measures how much each feature helped the trees split the songs during training. Both agree that acousticness matters most, followed by danceability and instrumentalness.

This shows users what the model "listens" to, but it describes the model, not the music: a song isn't jazz because of its acousticness score. Features that go together can also share the importance. Energy and loudness have a correlation of 0.83, so each of them can look less important than it really is. Both methods also describe the model as a whole: the app can't explain why one specific song got its genre, which would help users judge a single answer.

## Why this is a weak model

The test results look decent, but a closer look shows that the model is weak:

- **It is wrong about one time in five.** Without thresholds it gets 81.7% of the test songs right. With them, it gets 79.6% right if "not sure" counts as wrong.
- **It is worse on artists it hasn't seen.** 86% of the test songs are by artists who also have songs in the training set. On those, the model is right 83% of the time. On the 134 test songs by new artists, it is right only 73% of the time. So for new music, the headline numbers are too optimistic.
- **It can be very sure and still wrong.** 14 of the songs it was at least 90% sure about were wrong. "The Champion" by Carrie Underwood and Ludacris is labeled country, but the model is 97% sure it is hip-hop. Ludacris raps on it, so the song is really both. Many of the confident mistakes are like this: country songs with rap, or songs with a doubtful label, like reggaeton labeled as hip-hop.
- **It knows very little about a song.** It doesn't hear the music. It only gets 14 numbers per song, and nothing about the lyrics, the instruments or where the music comes from, even though a genre is also about culture and history. The numbers are Spotify's own estimates, made by another algorithm, so the model builds on guesses. Spotify also stopped giving these numbers to new apps in 2024, so the model can't easily be used on new songs.
- **The task was made easy.** The six genres were picked because they sound very different and share few songs. Real music has many close genres (the full dataset has 114, like rock, alt-rock and indie), and that task would be much harder.
- **It is uneven.** The F1 score is 0.90 for classical and 0.89 for heavy-metal, but only 0.70 for country and 0.64 for jazz.

## Who gets the mistakes?

The mistakes don't hit everyone equally. They mostly hit the music that doesn't fit the six boxes:

- **Indian music.** Of the 161 classical test songs, 123 are Western and 38 are Indian (some of them are really film or devotional songs). The model recognised 121 of the 123 Western songs, but only 23 of the 38 Indian ones: 15 of the 17 classical songs it missed are Indian. This is probably because the model learned "classical" mostly from Western music, which is mostly instrumental, while much of the Indian music is sung. Even the project's first notebook describes classical as "mostly orchestral and instrumental music", which is a Western view.
- **Artists who mix genres.** Country songs with rap, like "The Champion", get called hip-hop with high confidence, and mixed songs are also the ones most likely to get "not sure".
- **New artists.** They get the right genre 73% of the time, against 83% for artists the model has already seen. New and small artists are the ones who need a fair label the most, since nobody knows them yet.
- **Jazz and country.** These have the lowest F1 scores, so artists in these genres get more wrong labels.

If a music service used a model like this to sort songs into playlists, these groups would be sent to the wrong listeners most often. The problem could also grow by itself: a song shown to the wrong listeners gets fewer plays, looks less popular, and gets shown even less.

## Usability and accessibility

The app is one page with three views: Predict, Thresholds and Features. Users can search for a song (also with ⌘K) or describe one with sliders. For songs from the dataset, the prediction is shown next to the real label, so users can see when the model is wrong. Probability bars with a line for each threshold show how sure the model is, and "not sure" comes with a short explanation, like "hip-hop is most likely (30%), but below its threshold". Extra details stay hidden until the user opens them.

Album covers, music videos and DJ mode make the app fun, but they can also pull attention away from the model's limits. The moving background stops for people who have turned off animations on their computer, but the light grey text on the dark glass design can be hard to read for people with weak eyesight. The app also only knows six genres, can only judge songs from the dataset or songs described with the sliders, and needs two servers to start, so it is a demo, not a product for people who aren't technical.

## Trustworthiness: when to trust it, and when not

**What the app does to earn trust.** It shows the test results for the current thresholds (accuracy 0.796 and macro F1 0.793 with the tuned ones), shows the real label next to each prediction, warns when a song was used in training (then the result is not a fair test), and says "not sure" instead of guessing. The backend also checks the input: missing or wrong values give an error, and thresholds outside 0–1 are ignored. But none of this fixes doubtful labels or the missing genres.

**What hurts trust.** There is no login, so anyone who can reach the backend can change the thresholds for everyone. Covers, previews and videos come from Spotify, Apple, YouTube and Wikidata. The app has no control over these services: a video found by search can be the wrong one, and the services can see which songs a user looks up. The YouTube player is also cropped so that YouTube's title and logo don't show, which YouTube's rules don't allow. That is fine for a private school project, but it would have to change before the app was shared. Finally, the polished design, with album covers, videos and glass effects, makes the model look more professional than it is. People already tend to trust computers too much (this is called automation bias), and a good-looking app makes that worse.

**When AI can be trusted.** In general, an AI model can be trusted more when:

- mistakes are cheap and easy to fix,
- the input looks like what the model was trained on,
- the model says how sure it is, and that has been checked,
- a person can check the answer, and
- the model was tested fairly on new cases.

It should not be trusted when the stakes are high, when the input is unlike its training data, or when the question has no single right answer, like what genre a mixed song "really" is.

**What this means for this model.** Its confidence is useful: when it is at least 90% sure, it is right 97% of the time (486 test songs), but when it is less than 50% sure, it is right only 44% of the time (97 songs). So it can be trusted for learning how sound features relate to genres, and as a first guess for clear, typical songs of the six genres when it is very sure. It should not be trusted for songs that mix genres, for music from outside the six genres or from non-Western traditions, for songs where it is less than about 70% sure, or for new artists without someone checking.

**What it should never be used for.** Decisions about people: which playlists artists get on, what they are paid, charts or promotion. A model can't be held responsible for a mistake, so a person always has to make and own decisions like these.

## The good and the bad

**The good:**

- Popularity is left out, so fame doesn't decide the genre.
- It says "not sure" instead of guessing, and its accuracy counts "not sure" as wrong, so the numbers aren't made to look better.
- The thresholds were chosen without the test songs, so the test is fair.
- It is open about itself: it shows its test results, the real label, the thresholds and the features it uses, and warns when a song was used in training.
- Its confidence means something: when it is at least 90% sure, it is right 97% of the time.
- It uses no personal data about listeners, and has no accounts.

**The bad:**

- The labels are opinions, mixed songs were removed, and the genres are Western. Only 23 of 38 Indian songs labeled classical are recognised, against 121 of 123 Western ones.
- It is weak: wrong one time in five, and right only 73% of the time for new artists.
- It can be very sure and still wrong.
- The "explicit" feature links hip-hop to explicit lyrics.
- One user can change the thresholds for everyone, there is no login, and the changes are lost on restart.
- Outside services can see what users look up, and the YouTube player breaks YouTube's rules.
- The polished design can make it look more trustworthy than it is.

> **Conclusion:** the classifier works best as a helpful hint for clear examples of the six genres, when it is very sure. It should not be the final word on mixed, culturally specific or unusual music, and it should never be used to make decisions about artists. A better version would need more and fairer data (with mixed and non-Western music), testing on new artists, explanations for single songs, and a login so that one user can't change the settings for everyone.
