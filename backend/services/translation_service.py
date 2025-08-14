from googletrans import Translator
import asyncio
import logging

logger = logging.getLogger(__name__)

def translate_to_hindi(text: str) -> str:
    """Translate English text to Hindi using googletrans."""
    try:
        translator = Translator()
        result = translator.translate(text, src='en', dest='hi')
        
        # Handle both sync and async results
        if asyncio.iscoroutine(result):
            # If it's a coroutine, run it in event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            try:
                actual_result = loop.run_until_complete(result)
                translated_text = actual_result.text
            except Exception as e:
                logger.error(f"Async translation failed: {e}")
                raise ConnectionError(f"Translation service connection failed: {e}")
        else:
            # If it's synchronous, use directly
            translated_text = result.text
        
        # Validate translation result
        if not translated_text or not translated_text.strip():
            raise ValueError("Translation service returned empty result")
        
        # Additional check - if translation is exactly the same as input (except for simple words)
        # it might indicate translation service is not working properly
        if translated_text.strip() == text.strip() and len(text.split()) > 2:
            logger.warning(f"Translation result identical to input - possible service issue: '{text}' -> '{translated_text}'")
            # Don't raise error here as some words/phrases might legitimately be the same
        
        logger.info(f"Translated '{text}' to '{translated_text}'")
        return translated_text
        
    except Exception as e:
        logger.error(f"Translation failed for '{text}': {e}")
        # Instead of fallback, raise the error to be handled by the endpoint
        if isinstance(e, (ConnectionError, TimeoutError)):
            raise e
        else:
            # Convert generic exceptions to more specific ones
            raise ConnectionError(f"Translation service failed: {e}")

def translate_to_english(text: str) -> str:
    """Translate Hindi text to English using googletrans."""
    try:
        translator = Translator()
        result = translator.translate(text, src='hi', dest='en')
        
        # Handle both sync and async results
        if asyncio.iscoroutine(result):
            # If it's a coroutine, run it in event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            try:
                actual_result = loop.run_until_complete(result)
                translated_text = actual_result.text
            except Exception as e:
                logger.error(f"Async translation failed: {e}")
                raise ConnectionError(f"Translation service connection failed: {e}")
        else:
            # If it's synchronous, use directly
            translated_text = result.text
        
        # Validate translation result
        if not translated_text or not translated_text.strip():
            raise ValueError("Translation service returned empty result")
        
        logger.info(f"Translated '{text}' to '{translated_text}'")
        return translated_text
        
    except Exception as e:
        logger.error(f"Translation failed for '{text}': {e}")
        # Instead of fallback, raise the error to be handled by the endpoint
        if isinstance(e, (ConnectionError, TimeoutError)):
            raise e
        else:
            # Convert generic exceptions to more specific ones
            raise ConnectionError(f"Translation service failed: {e}")
