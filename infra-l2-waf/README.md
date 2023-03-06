# WAF

This is a starter configuration for the WAF.

Please read the developer guide, as all WAFs should be deployed in Count mode, then upgraded to Block after testing.

https://docs.aws.amazon.com/waf/latest/developerguide/getting-started.html

## Simple use

To use this, simply comment out the rules that you no longer want to be in Count mode, and they'll follow the default action of their managed group.

Please read the documentation on AWS for the managed groups, and validate your key behaviours before running unsupervised in production.

Please also review the RuleGroups in the WAF console to ensure that the actions are appropriate, and ensure that the overrideAction for the ManagedRuleSets is set to None.

## Testing

The tests folder contains some example tests to get you started, but to lock rules in and ensure those exist, please extend the test suite to match your implementation.

## Checkov

Please also run checkov against the template to ensure that you're as secure as possible.  Any false positives that you need to skip should be reconfirmed with tests. (e.g. the Log4J check).