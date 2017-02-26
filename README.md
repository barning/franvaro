# :palm_tree: franvaro :palm_tree:
A bot for managing team-absence in slack

## How to Run:
* `npm install`
* Create `.env`
* Insert `TOKEN=Your Slack Token` and `NAME=YourBotName` in your `.env`
* Run `node index.js`

## What it does:
This bot creates a list of team-members who are absent. To put yourself on this list, just write something like `franvaro: ich bin abwesend` (yup it's german). The bot will answer and put you on the list. To remove yourself from the list, just say something like `franvaro: ich bin anwesend`.

The important keywords are `franvaro` and `abwesend` or `anwesend`. To see the complete list, just type `franvaro: status`. If something does not work, franvaro will inform you.
