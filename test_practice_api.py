import unittest
from unittest.mock import patch
from fastapi import HTTPException
from practice_api import PracticeRequest, practice_activity, validate_activity


class PracticeTests(unittest.TestCase):
    def activity(self, **overrides):
        return {"prompt": "What does bonjour mean?", "answer": "Hello", "explanation": "It is a greeting.",
                "choices": ["Hello", "Goodbye", "Thanks", "Please"], **overrides}

    def test_mcq_requires_four_unique_choices_and_matching_answer(self):
        validate_activity(self.activity(), "mcq")
        for changes in ({"choices": ["Hello"]}, {"choices": ["Hello"] * 4}, {"answer": "Missing"}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_activity(self.activity(**changes), "mcq")

    def test_blank_requires_exactly_one_gap(self):
        validate_activity(self.activity(prompt="Je ____ ici."), "fillintheblank")
        for prompt in ("No gap", "____ et ____"):
            with self.assertRaises(ValueError):
                validate_activity(self.activity(prompt=prompt), "fillintheblank")

    def test_missing_token_rejected_before_database_access(self):
        with self.assertRaises(HTTPException) as result:
            practice_activity(PracticeRequest(encounterId="entry", kind="mcq"), "")
        self.assertEqual(result.exception.status_code, 401)

    @patch("practice_api.generate_activity")
    @patch("practice_api.firestore.client")
    @patch("practice_api.auth.verify_id_token", return_value={"uid": "authenticated-user"})
    @patch("practice_api.firebase_admin.get_app")
    def test_reads_only_authenticated_users_encounter(self, app, verify, client, generate):
        user = client.return_value.collection.return_value.document.return_value
        user.collection.return_value.document.return_value.get.return_value.to_dict.return_value = {"text": "Bonjour", "language": "fr"}
        user.get.return_value.to_dict.return_value = {"nativeLanguage": ["en"]}
        generate.return_value = self.activity()
        result = practice_activity(PracticeRequest(encounterId="entry", kind="mcq"), "Bearer token")
        client.return_value.collection.assert_called_once_with("users")
        client.return_value.collection.return_value.document.assert_called_once_with("authenticated-user")
        user.collection.assert_called_once_with("encounters")
        generate.assert_called_once_with("Bonjour", "fr", "en", "mcq")
        self.assertEqual(result["kind"], "mcq")


if __name__ == "__main__":
    unittest.main()
