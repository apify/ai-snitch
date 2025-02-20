## TypeScript Bee Agent Framework Template

A template for [Bee Agent Framework](https://i-am-bee.github.io/bee-agent-framework/#/) projects in TypeScript for building AI agents with [Apify Actors](https://apify.com/actors). This template offers a structured setup and an example [ReAct agent](https://react-lm.github.io/) utilizing [Instagram Scraper](https://apify.com/apify/instagram-scraper) and a calculator tool in a workflow context.

### How it Works

A [ReAct agent](https://react-lm.github.io/) is employed, equipped with tools to respond to user queries. The agent processes a user query, decides on the tools to use, and in what sequence, to achieve the desired outcome. Here, the agent leverages an Instagram Scraper to fetch posts from a profile and a calculator tool to compute sums, such as totaling likes or comments. The agent produces textual and structured output, which is saved to a dataset.

### How to Use

Add or modify tools in the `src/tool_calculator.ts` and `src/tool_instagram.ts` files, and ensure they are included in the agent's tool list in `src/main.ts`. Additionally, you can update the agent's system prompt or other configurations within `src/main.ts`. For more information, refer to the [Bee Agent documentation](https://i-am-bee.github.io/bee-agent-framework/#/agents?id=bee-agent).

#### Pay Per Event

This template uses the [Pay Per Event](https://docs.apify.com/sdk/js/docs/next/guides/pay-per-event) (PPE) monetization model, which provides flexible pricing based on defined events.

To charge users, define events in JSON format and save them on the Apify platform. Here is an example schema with the `task-completed` event:

```json
[
    {
        "task-completed": {
            "eventTitle": "Task completed",
            "eventDescription": "Cost per query answered.",
            "eventPriceUsd": 0.1
        }
    }
]
```

In the Actor, trigger the event with:

```typescript
await Actor.charge({ eventName: 'task-completed' });
```

This approach allows you to programmatically charge users directly from your Actor, covering the costs of execution and related services, such as LLM input/output tokens.

To set up the PPE model for this Actor:
- **Configure the OpenAI API key environment variable**: provide your OpenAI API key to the `OPENAI_API_KEY` in the Actor's **Environment variables**.
- **Configure Pay Per Event**: establish the Pay Per Event pricing schema in the Actor's **Admin settings**. First, set the **Pricing model** to `Pay per event` and add the schema. An example schema can be found in [pay_per_event.json](.actor/pay_per_event.json).

### Included Features

- **[Apify SDK](https://docs.apify.com/sdk/js/)** for JavaScript - a toolkit for building Apify [Actors](https://apify.com/actors) and scrapers in JavaScript
- **[Input schema](https://docs.apify.com/platform/actors/development/input-schema)** - define and easily validate a schema for your Actor's input
- **[Dataset](https://docs.apify.com/sdk/js/docs/guides/result-storage#dataset)** - store structured data where each object stored has the same attributes
- **[Key-value store](https://docs.apify.com/platform/storage/key-value-store)** - store any kind of data, such as JSON documents, images, or text files

### Resources

- [What are AI agents?](https://blog.apify.com/what-are-ai-agents/)
- [TypeScript tutorials in Academy](https://docs.apify.com/academy/node-js)
- [Apify SDK documentation](https://docs.apify.com/sdk/js/)
- [Bee Agent Framework documentation](https://i-am-bee.github.io/bee-agent-framework/#/)
- [Integration with Make, GitHub, Zapier, Google Drive, and other apps](https://apify.com/integrations)


## Getting started

For complete information [see this article](https://docs.apify.com/platform/actors/development#build-actor-locally). To run the actor use the following command:

```bash
apify run
```

## Deploy to Apify

### Connect Git repository to Apify

If you've created a Git repository for the project, you can easily connect to Apify:

1. Go to [Actor creation page](https://console.apify.com/actors/new)
2. Click on **Link Git Repository** button

### Push project on your local machine to Apify

You can also deploy the project on your local machine to Apify without the need for the Git repository.

1. Log in to Apify. You will need to provide your [Apify API Token](https://console.apify.com/account/integrations) to complete this action.

    ```bash
    apify login
    ```

2. Deploy your Actor. This command will deploy and build the Actor on the Apify Platform. You can find your newly created Actor under [Actors -> My Actors](https://console.apify.com/actors?tab=my).

    ```bash
    apify push
    ```

## Documentation reference

To learn more about Apify and Actors, take a look at the following resources:

- [Apify SDK for JavaScript documentation](https://docs.apify.com/sdk/js)
- [Apify SDK for Python documentation](https://docs.apify.com/sdk/python)
- [Apify Platform documentation](https://docs.apify.com/platform)
- [Join our developer community on Discord](https://discord.com/invite/jyEM2PRvMU)
