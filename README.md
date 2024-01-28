# HoyaHacks24 Project #20 - StreetWatch
## Inspiration
Navigating the complexities of urban environments, we often encounter the menace of illegally parked vehicles. These vehicles not only disrupt the flow of traffic but also pose significant risks to the safety of bikers, pedestrians, and other drivers. With a desire to foster a more responsible and lawful parking culture, we envisioned StreetWatch - an innovative solution that leverages public participation to identify and report parking violations.

## What it Does
StreetWatch revolutionizes the way parking violations are monitored and reported. Our user-friendly mobile application empowers individuals to take action against illegal parking. By simply capturing a photo of the offending vehicle and uploading it, users contribute to a safer community. The app, using cutting-edge technology, analyzes these submissions for the vehicle's license plate number and assesses the likelihood of a parking violation based on our extensive training data. Top-ranked reports are formatted and forwarded to relevant authorities for action, and in a pioneering move, users are rewarded with a share of the ensuing fines.

## How We Built It
The StreetWatch app, crafted with JavaScript and React Native, operates seamlessly on Expo Go. It utilizes standard react modules to access the camera and location services on users’ devices. Our server, powered by Python, manages image data via a Flask server and sqlite3 database. For vehicle detection and license plate recognition, we integrated Roboflow and KerasOCR, respectively. This intricate combination of software and user-generated data culminates in a streamlined process for generating actionable reports for parking enforcement agencies.

## Challenges We Ran Into
Our journey was not without its hurdles. Achieving consistent image and location data across a variety of devices was a significant challenge, overcome by experimenting with various libraries. Additionally, navigating the proprietary landscape of license plate and parking recognition technologies posed its own set of difficulties.

## Accomplishments We're Proud Of
We take immense pride in our ability to provide a seamless, efficient experience for users to capture and submit evidence of parking violations. The integration of diverse image recognition technologies into a unified, automated system marks a significant milestone in our journey, eliminating the need for manual processing and paving the way for swift action against offenders.

## What We Learned
Working across development environments on different platforms and with different frameworks forced us to truly master connectivity and communication between devices, to get the server, api, and app to all work in sync as one. We also learned about the intricacies of creating a useable and nice-looking UI for an app that is compatible across devices. With user camera and location data being required for the app functionality, we learned to be as careful as possible about transparency to the user and taking great care to not leak any unnecessary data entrusted to us. 

## What's Next for StreetWatch
With the foundations of StreetWatch firmly in place, our next step is to forge partnerships with local government bodies. Our goal is to introduce prototype versions of the app to the public, harnessing the power of community engagement to enhance parking regulation. Jurisdictions like New York City [have already embraced](https://www.bloomberg.com/news/articles/2022-09-29/nyc-may-pay-people-for-reporting-bike-lane-blockers) similar initiatives, showcasing a growing trend towards community-involved enforcement and setting a promising stage for StreetWatch's integration and success.

