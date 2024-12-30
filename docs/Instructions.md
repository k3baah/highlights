install

go on settings
- chat -> enable chat
- add a provider and an api key (probably use anthropic i didn't test with anything else)
    select anthropic, add the key, then add `claude-3.5-sonnet-latest` as the model

 
    NOTE THAT WHEN U FIRST TRY AND INITIALISE SETTINGS, you need the clip-btn enabled in side-panel.html otherwise basically you get issues like running initializeUI i guess? and then basically you can't load the model settings and the whole thing breaks.

    TODO

    - [] decouple llm chat logic from the Interpreter. can remove the interpreter
    - [] remove the need to have a template with {{params}} to initialise the interpreter
    - [] fix above bug
    - [] try and understand the whole codebase especially the chat bits lol. get an idea on the whole flow of operations
    - [] remove features you don't use