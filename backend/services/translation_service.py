from googletrans import Translator


def translate_to_hindi(text: str) -> str:
    """Translate English text to Hindi using googletrans."""
    translator = Translator()
    result = translator.translate(text, src='en', dest='hi')
    return result.text

def translate_to_english(text: str) -> str:
    """Translate Hindi text to English using googletrans."""
    translator = Translator()
    result = translator.translate(text, src='hi', dest='en')
    return result.text
